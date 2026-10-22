"""메타 앱 심사·유튜브 API 감사 결과 메일 확인. 새 메일이 있을 때만 보고."""
from __future__ import annotations

from datetime import datetime

from .. import google_api, notify
from ..config import Config
from ..db import DB


def run(cfg: Config, db: DB, dry_run: bool = False) -> str:
    gm = google_api.gmail(cfg)
    now = datetime.now(cfg.tz)
    found = []
    for watch in cfg.gmail_watches:
        resp = gm.users().messages().list(userId="me", q=f"({watch['query']}) newer_than:7d", maxResults=10).execute()
        for m in resp.get("messages", []):
            if db.mail_seen(m["id"]):
                continue
            msg = gm.users().messages().get(
                userId="me", id=m["id"], format="metadata", metadataHeaders=["Subject", "From", "Date"],
            ).execute()
            headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
            subject = headers.get("Subject", "(제목 없음)")
            found.append(f"[{watch['name']}] {subject}\n  보낸 사람: {headers.get('From', '')}\n  {msg.get('snippet', '')[:200]}")
            if not dry_run:
                db.mark_mail(m["id"], watch["name"], subject, now)
    if found:
        notify.send(cfg, "새 결과 메일", "\n".join(found))
    return f"새 메일 {len(found)}개"
