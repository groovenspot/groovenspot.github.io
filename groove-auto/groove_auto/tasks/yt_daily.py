"""유튜브 일일 결산: 조회·구독 증감, 상위 영상, 새 숏츠 첫 반응, 28일 수치."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from .. import google_api, notify
from ..config import Config
from ..db import DB

# 애널리틱스 데이터는 2~3일 늦게 확정되므로 그만큼 앞에서 끊는다
ANALYTICS_LAG_DAYS = 3


def _seconds(iso_duration: str) -> int:
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration or "")
    if not m:
        return 0
    h, mi, s = (int(x or 0) for x in m.groups())
    return h * 3600 + mi * 60 + s


def run(cfg: Config, db: DB, dry_run: bool = False) -> str:
    yt = google_api.youtube(cfg)
    ch = google_api.my_channel(yt, cfg)
    now = datetime.now(cfg.tz)
    today = now.date()

    st = ch["statistics"]
    subs, views, videos = int(st.get("subscriberCount", 0)), int(st.get("viewCount", 0)), int(st.get("videoCount", 0))
    prev = db.stats_before(today)

    lines = [f"구독 {subs:,}명 · 누적 조회 {views:,} · 영상 {videos:,}개"]
    if prev:
        lines.append(
            f"어제({prev['day']}) 대비: 구독 {subs - prev['subscribers']:+,} · 조회 {views - prev['views']:+,}"
        )

    # 28일 수치와 최근 7일 상위 영상
    ya = google_api.youtube_analytics(cfg)
    end = today - timedelta(days=ANALYTICS_LAG_DAYS)
    totals = ya.reports().query(
        ids="channel==MINE",
        startDate=(end - timedelta(days=27)).isoformat(),
        endDate=end.isoformat(),
        metrics="views,estimatedMinutesWatched,subscribersGained,subscribersLost",
    ).execute()
    extra: dict = {}
    if totals.get("rows"):
        v, minutes, gained, lost = totals["rows"][0]
        extra["28d"] = {"views": v, "minutes": minutes, "subs_net": gained - lost}
        lines.append(f"28일(~{end:%m/%d}): 조회 {int(v):,} · 시청 {int(minutes):,}분 · 구독 순증 {int(gained - lost):+,}")

    top = ya.reports().query(
        ids="channel==MINE",
        startDate=(end - timedelta(days=6)).isoformat(),
        endDate=end.isoformat(),
        metrics="views",
        dimensions="video",
        sort="-views",
        maxResults=5,
    ).execute()
    top_rows = top.get("rows", [])
    if top_rows:
        ids = [r[0] for r in top_rows]
        titles = {
            it["id"]: it["snippet"]["title"]
            for it in yt.videos().list(part="snippet", id=",".join(ids)).execute().get("items", [])
        }
        lines.append("최근 7일 상위 영상:")
        for vid, v in top_rows:
            lines.append(f"  {int(v):,}회 · {titles.get(vid, vid)}")

    # 최근 72시간 안에 공개된 숏츠의 첫 반응
    uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]
    recent = yt.playlistItems().list(part="contentDetails", playlistId=uploads, maxResults=25).execute()
    ids = [it["contentDetails"]["videoId"] for it in recent.get("items", [])]
    fresh = []
    if ids:
        for it in yt.videos().list(part="snippet,statistics,contentDetails,status", id=",".join(ids)).execute().get("items", []):
            if it["status"].get("privacyStatus") != "public":
                continue
            published = datetime.fromisoformat(it["snippet"]["publishedAt"].replace("Z", "+00:00"))
            if now.astimezone(timezone.utc) - published > timedelta(hours=72):
                continue
            if _seconds(it["contentDetails"]["duration"]) > 180:
                continue
            s = it["statistics"]
            fresh.append(
                f"  {it['snippet']['title']}: 조회 {int(s.get('viewCount', 0)):,} · "
                f"좋아요 {int(s.get('likeCount', 0)):,} · 댓글 {int(s.get('commentCount', 0)):,}"
            )
    if fresh:
        lines.append("새 숏츠 첫 반응(72시간):")
        lines.extend(fresh)

    if not dry_run:
        db.save_stats(today, subs, views, videos, extra)
    body = "\n".join(lines)
    notify.send(cfg, f"유튜브 일일 결산 {today:%m/%d}", body)
    return lines[0]
