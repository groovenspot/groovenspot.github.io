"""명령줄 진입점: python -m groove_auto <명령>"""
from __future__ import annotations

import argparse
import os
import plistlib
import sys
import traceback
from datetime import date, datetime
from pathlib import Path

from . import config as config_mod
from . import dashboard, notify
from .db import DB

# launchd 기본 시각 (맥미니 시계 기준, KST)
SCHEDULE = {
    "gmail-watch": (9, 47),
    "shorts-apply": (10, 30),
    "comments": (13, 47),
    "yt-daily": (16, 10),
}
ROOT = Path(__file__).resolve().parent.parent


def load_secrets(cfg) -> None:
    """launchd 는 셸 환경변수를 안 읽으므로 data_dir/secrets.env 에서 읽는다."""
    path = cfg.data_dir / "secrets.env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"'))


def run_task(cfg, name: str, fn, dry_run: bool) -> int:
    db = DB(cfg.db_path)
    started = datetime.now(cfg.tz)
    try:
        summary = fn(cfg, db, dry_run=dry_run)
        ok = True
    except Exception as exc:  # 실패도 기록하고 보고한다
        summary = f"{type(exc).__name__}: {exc}"
        ok = False
        traceback.print_exc()
        notify.send(cfg, f"작업 실패: {name}", summary)
    if not dry_run:
        db.log_run(name, started, ok, summary)
    path = dashboard.write(cfg, db, datetime.now(cfg.tz))
    db.close()
    print(f"{name}: {summary}\n현황: {path}")
    return 0 if ok else 1


def write_launchd(cfg) -> None:
    agents = Path.home() / "Library" / "LaunchAgents"
    agents.mkdir(parents=True, exist_ok=True)
    logs = cfg.data_dir / "logs"
    logs.mkdir(exist_ok=True)
    for task, (hour, minute) in SCHEDULE.items():
        label = f"com.groovenspot.auto.{task}"
        plist = {
            "Label": label,
            "ProgramArguments": [sys.executable, "-m", "groove_auto", task],
            "WorkingDirectory": str(ROOT),
            # 잠자기 중 놓친 실행은 깨어난 직후 한 번 실행된다
            "StartCalendarInterval": {"Hour": hour, "Minute": minute},
            "StandardOutPath": str(logs / f"{task}.log"),
            "StandardErrorPath": str(logs / f"{task}.log"),
        }
        path = agents / f"{label}.plist"
        with path.open("wb") as f:
            plistlib.dump(plist, f)
        print(f"{hour:02d}:{minute:02d} {task} → {path}")
    print("\n등록: for f in ~/Library/LaunchAgents/com.groovenspot.auto.*.plist; do launchctl load -w \"$f\"; done")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="groove_auto", description="그루브 운영 자동화")
    p.add_argument("--config", type=Path, help="설정 파일 (기본: groove-auto/config.toml)")
    p.add_argument("--dry-run", action="store_true", help="읽기만 하고 답글·예약·기록은 하지 않음")
    sub = p.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("auth", help="구글·카카오 계정 인증 (맥미니에서 한 번)")
    a.add_argument("which", choices=["youtube", "gmail", "kakao"])
    sub.add_parser("yt-daily", help="유튜브 일일 결산")
    sub.add_parser("comments", help="유튜브 댓글 확인·답글")
    sub.add_parser("gmail-watch", help="심사·감사 결과 메일 확인")

    s = sub.add_parser("shorts", help="숏츠 예약 큐 관리")
    ss = s.add_subparsers(dest="shorts_cmd", required=True)
    add = ss.add_parser("add", help="예약 대기열에 추가")
    add.add_argument("video_id")
    add.add_argument("--dj", required=True)
    add.add_argument("--song", required=True)
    rec = ss.add_parser("record", help="이미 유튜브에 예약된 숏츠를 기록 (규칙 계산용)")
    rec.add_argument("video_id")
    rec.add_argument("--dj", required=True)
    rec.add_argument("--song", required=True)
    rec.add_argument("--day", required=True, type=date.fromisoformat, help="YYYY-MM-DD")
    ss.add_parser("list", help="큐 보기")
    ss.add_parser("plan", help="규칙대로 배정해 보기 (반영 안 함)")
    sub.add_parser("shorts-apply", help="계획대로 유튜브에 예약하고 재생목록에 추가")

    sub.add_parser("dashboard", help="현황 페이지 다시 만들기")
    sub.add_parser("launchd", help="맥미니 자동 실행 등록 파일 만들기")

    args = p.parse_args(argv)
    cfg = config_mod.load(args.config)
    load_secrets(cfg)

    if args.cmd == "auth" and args.which == "kakao":
        from . import kakao
        print(f"저장됨: {kakao.authorize(cfg)}")
        notify.send(cfg, "그루브 자동화", "카카오톡 보고 연결 완료")
        return 0
    if args.cmd == "auth":
        from . import google_api
        print(f"저장됨: {google_api.authorize(cfg, args.which)}")
        return 0
    if args.cmd == "yt-daily":
        from .tasks import yt_daily
        return run_task(cfg, "yt-daily", yt_daily.run, args.dry_run)
    if args.cmd == "comments":
        from .tasks import yt_comments
        return run_task(cfg, "comments", yt_comments.run, args.dry_run)
    if args.cmd == "gmail-watch":
        from .tasks import gmail_watch
        return run_task(cfg, "gmail-watch", gmail_watch.run, args.dry_run)
    if args.cmd == "shorts-apply":
        from .tasks import shorts
        return run_task(cfg, "shorts-apply", shorts.apply, args.dry_run)
    if args.cmd == "shorts":
        from .tasks import shorts
        db = DB(cfg.db_path)
        now = datetime.now(cfg.tz)
        if args.shorts_cmd == "add":
            db.add_short(args.video_id, args.dj, args.song, now)
            print(f"추가: {args.dj} · {args.song}")
        elif args.shorts_cmd == "record":
            db.add_scheduled_short(args.video_id, args.dj, args.song, args.day, now)
            print(f"기록: {args.day} {args.dj} · {args.song}")
        elif args.shorts_cmd == "list":
            for r in db.shorts():
                print(f"{r['publish_day'] or '대기':10} {r['dj']:10} {r['song']}  {r['video_id']}{'  ✓' if r['applied'] else ''}")
        elif args.shorts_cmd == "plan":
            print(shorts.describe(shorts.make_plan(cfg, db, now.date())))
        dashboard.write(cfg, db, now)
        db.close()
        return 0
    if args.cmd == "dashboard":
        db = DB(cfg.db_path)
        print(dashboard.write(cfg, db, datetime.now(cfg.tz)))
        db.close()
        return 0
    if args.cmd == "launchd":
        write_launchd(cfg)
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
