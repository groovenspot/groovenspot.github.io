"""현황 페이지 생성. 매 작업이 끝날 때마다 data_dir/dashboard.html 을 다시 쓴다."""
from __future__ import annotations

import json
from datetime import datetime
from html import escape
from pathlib import Path

from .config import Config
from .db import DB

TASK_NAMES = {
    "yt-daily": "유튜브 일일 결산",
    "comments": "댓글 확인",
    "gmail-watch": "결과 메일 확인",
    "shorts-apply": "숏츠 예약",
}

CSS = """
:root{--bg:#fafaf9;--fg:#1c1917;--muted:#78716c;--line:#e7e5e4;--ok:#15803d;--bad:#b91c1c;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#f5f5f4;--muted:#a8a29e;--line:#292524;--ok:#4ade80;--bad:#f87171;--card:#1c1917}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,"Apple SD Gothic Neo",sans-serif}
main{max-width:880px;margin:0 auto;padding:24px 16px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}
.muted{color:var(--muted);font-size:13px}.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px}.tile b{display:block;font-size:22px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
td,th{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:14px}th{color:var(--muted);font-weight:500}
.ok{color:var(--ok)}.bad{color:var(--bad)}.wrap{overflow-x:auto}
"""


def _table(headers: list[str], rows: list[list[str]]) -> str:
    if not rows:
        return '<p class="muted">없음</p>'
    head = "".join(f"<th>{escape(h)}</th>" for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<div class="wrap"><table><tr>{head}</tr>{body}</table></div>'


def render(cfg: Config, db: DB, now: datetime) -> str:
    stats = db.recent_stats(14)
    tiles = ""
    if stats:
        latest = stats[0]
        extra = json.loads(latest["extra"] or "{}").get("28d", {})
        tiles = (
            f'<div class="tile"><span class="muted">구독자</span><b>{latest["subscribers"]:,}</b></div>'
            f'<div class="tile"><span class="muted">누적 조회</span><b>{latest["views"]:,}</b></div>'
            f'<div class="tile"><span class="muted">영상</span><b>{latest["videos"]:,}</b></div>'
        )
        if extra:
            tiles += f'<div class="tile"><span class="muted">28일 조회</span><b>{int(extra["views"]):,}</b></div>'

    runs = [
        [escape(TASK_NAMES.get(r["task"], r["task"])), escape(r["started_at"].replace("T", " ")),
         '<span class="ok">정상</span>' if r["ok"] else '<span class="bad">실패</span>', escape(r["summary"] or "")]
        for r in db.last_runs()
    ]
    shorts = [
        [escape(r["publish_day"] or "대기"), escape(r["dj"]), escape(r["song"]),
         "예약됨" if r["applied"] else "-"]
        for r in db.shorts() if not r["publish_day"] or r["publish_day"] >= now.date().isoformat()
    ]
    comments = [
        [escape(r["handled_at"].replace("T", " ")[5:16]), escape(r["category"] or ""), escape(r["action"]),
         escape(r["text"][:80]) + (f'<br><span class="muted">→ {escape(r["reply"])}</span>' if r["reply"] and r["action"] == "replied" else "")]
        for r in db.recent_comments(20)
    ]
    daily = [
        [escape(r["day"]), f'{r["subscribers"]:,}', f'{r["views"]:,}'] for r in stats
    ]
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>그루브 자동화 현황</title><style>{CSS}</style></head>
<body><main><h1>그루브 자동화 현황</h1><p class="muted">{now:%Y-%m-%d %H:%M} 갱신</p>
<div class="tiles">{tiles}</div>
<h2>작업별 마지막 실행</h2>{_table(["작업", "시각", "결과", "요약"], runs)}
<h2>숏츠 예약 큐</h2>{_table(["공개일", "DJ", "곡", "유튜브"], shorts)}
<h2>최근 처리한 댓글</h2>{_table(["시각", "분류", "처리", "댓글"], comments)}
<h2>일별 수치</h2>{_table(["날짜", "구독", "누적 조회"], daily)}
</main></body></html>"""


def write(cfg: Config, db: DB, now: datetime) -> Path:
    out = cfg.data_dir / "dashboard.html"
    out.write_text(render(cfg, db, now), encoding="utf-8")
    return out
