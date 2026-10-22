"""유튜브 댓글 확인: 긍정은 자동 답글, 불만·문의는 보고만."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .. import claude, google_api, notify
from ..config import Config
from ..db import DB


def run(cfg: Config, db: DB, dry_run: bool = False) -> str:
    yt = google_api.youtube(cfg)
    ch = google_api.my_channel(yt, cfg)
    channel_id = ch["id"]
    now = datetime.now(cfg.tz)
    cutoff = now.astimezone(timezone.utc) - timedelta(hours=cfg.lookback_hours)

    threads = []
    page = None
    while True:
        resp = yt.commentThreads().list(
            part="snippet,replies", allThreadsRelatedToChannelId=channel_id,
            order="time", maxResults=100, pageToken=page, textFormat="plainText",
        ).execute()
        stop = False
        for t in resp.get("items", []):
            top = t["snippet"]["topLevelComment"]["snippet"]
            if datetime.fromisoformat(top["publishedAt"].replace("Z", "+00:00")) < cutoff:
                stop = True
                break
            threads.append(t)
        page = resp.get("nextPageToken")
        if stop or not page:
            break

    titles: dict[str, str] = {}
    replied, reports = [], []
    for t in threads:
        top = t["snippet"]["topLevelComment"]["snippet"]
        cid = t["id"]
        if db.comment_handled(cid):
            continue
        author_channel = top.get("authorChannelId", {}).get("value")
        if author_channel == channel_id:
            continue  # 우리 채널이 단 댓글
        already = any(
            r["snippet"].get("authorChannelId", {}).get("value") == channel_id
            for r in t.get("replies", {}).get("comments", [])
        )
        if already:
            if not dry_run:
                db.mark_comment(cid, top["videoId"], top["authorDisplayName"], top["textDisplay"],
                                "", "already_replied", "", now)
            continue

        vid = top["videoId"]
        if vid not in titles:
            items = yt.videos().list(part="snippet", id=vid).execute().get("items", [])
            titles[vid] = items[0]["snippet"]["title"] if items else vid
        text = top["textDisplay"]
        verdict = claude.classify_comment(cfg, titles[vid], text)

        action = "reported"
        if verdict.category == "positive" and cfg.auto_reply:
            if claude.reply_is_safe(verdict.reply, cfg.forbidden_words):
                if not dry_run:
                    yt.comments().insert(
                        part="snippet",
                        body={"snippet": {"parentId": cid, "textOriginal": verdict.reply}},
                    ).execute()
                action = "replied"
                replied.append(f"  {top['authorDisplayName']}: {text[:60]}\n    → {verdict.reply}")
            else:
                reports.append(f"  [답글 보류: 금지어·링크] {titles[vid]}\n    {top['authorDisplayName']}: {text}\n    초안: {verdict.reply}")
        elif verdict.category == "spam":
            action = "ignored"
        elif verdict.category != "positive":
            label = {"negative": "불만", "question": "문의", "refused": "판단 불가"}[verdict.category]
            reports.append(f"  [{label}] {titles[vid]}\n    {top['authorDisplayName']}: {text}")

        if not dry_run:
            db.mark_comment(cid, vid, top["authorDisplayName"], text, verdict.category, action, verdict.reply, now)

    summary = f"새 댓글 {len(threads)}개 중 답글 {len(replied)}개, 보고 {len(reports)}개"
    if replied or reports:
        parts = [summary]
        if reports:
            parts += ["확인 필요:"] + reports
        if replied:
            parts += ["자동 답글:"] + replied
        notify.send(cfg, "유튜브 댓글" + (" (dry-run)" if dry_run else ""), "\n".join(parts))
    return summary
