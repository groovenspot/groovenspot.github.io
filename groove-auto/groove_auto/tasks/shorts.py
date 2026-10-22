"""숏츠 예약: 규칙에 맞춰 날짜를 정하고 유튜브에 예약 + DJ별 재생목록에 추가 (dj_pl.py 대체)."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from .. import google_api, notify
from ..config import Config
from ..db import DB
from ..schedule_rules import Short, plan_shorts


def make_plan(cfg: Config, db: DB, today: date):
    rows = db.shorts()
    scheduled = {
        date.fromisoformat(r["publish_day"]): Short(r["video_id"], r["dj"], r["song"])
        for r in rows if r["publish_day"]
    }
    queue = [Short(r["video_id"], r["dj"], r["song"]) for r in rows if not r["publish_day"]]
    return plan_shorts(queue, scheduled, start=today + timedelta(days=1),
                       same_song_gap_days=cfg.same_song_gap_days)


def describe(plan) -> str:
    lines = [f"{d:%m/%d(%a)} {s.dj} · {s.song} ({s.video_id})" for d, s in plan.assigned]
    if plan.leftover:
        lines.append("규칙 때문에 날짜를 못 잡은 항목: " + ", ".join(f"{s.dj}·{s.song}" for s in plan.leftover))
    return "\n".join(lines) or "예약할 숏츠가 없습니다."


def apply(cfg: Config, db: DB, dry_run: bool = False) -> str:
    today = datetime.now(cfg.tz).date()
    plan = make_plan(cfg, db, today)
    if not plan.assigned:
        return describe(plan)
    if dry_run:
        print(describe(plan))
        return f"(dry-run) {len(plan.assigned)}개 예약 예정"

    yt = google_api.youtube(cfg)
    google_api.my_channel(yt, cfg)
    done, problems = [], []
    for day, s in plan.assigned:
        items = yt.videos().list(part="status", id=s.video_id).execute().get("items", [])
        if not items:
            problems.append(f"{s.video_id}: 영상을 찾을 수 없음")
            continue
        status = items[0]["status"]
        if status.get("privacyStatus") == "public":
            problems.append(f"{s.video_id}: 이미 공개된 영상")
            continue
        publish_at = datetime.combine(day, cfg.publish_time, tzinfo=cfg.tz).astimezone(timezone.utc)
        # status 전체를 다시 보내야 다른 설정(아동용 여부 등)이 지워지지 않는다
        status.update(privacyStatus="private", publishAt=publish_at.isoformat().replace("+00:00", "Z"))
        for read_only in ("uploadStatus", "failureReason", "rejectionReason"):
            status.pop(read_only, None)
        yt.videos().update(part="status", body={"id": s.video_id, "status": status}).execute()

        playlist = next((pid for dj, pid in cfg.dj_playlists.items() if dj.lower() == s.dj.lower()), None)
        if playlist:
            yt.playlistItems().insert(
                part="snippet",
                body={"snippet": {"playlistId": playlist, "resourceId": {"kind": "youtube#video", "videoId": s.video_id}}},
            ).execute()
        else:
            problems.append(f"{s.dj}: DJ별 재생목록이 config에 없음 ({s.video_id})")
        db.set_publish_day(s.video_id, day)
        db.mark_applied(s.video_id)
        done.append(f"{day:%m/%d} {cfg.publish_time:%H:%M} {s.dj} · {s.song}")

    body = "\n".join(done + (["문제:"] + problems if problems else []) +
                     (["남은 항목: " + ", ".join(f"{x.dj}·{x.song}" for x in plan.leftover)] if plan.leftover else []))
    notify.send(cfg, "숏츠 예약", body)
    return f"{len(done)}개 예약"
