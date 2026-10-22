"""보고 보내기. 텔레그램이 설정돼 있으면 텔레그램으로, 아니면 터미널·로그에만."""
from __future__ import annotations

import json
import os
import urllib.request

from .config import Config


def send(cfg: Config, title: str, body: str) -> None:
    text = f"[{title}]\n{body}".strip()
    print(text)
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not (token and cfg.telegram_chat_id):
        return
    # 텔레그램 메시지 한도 4096자
    for start in range(0, len(text), 4000):
        payload = json.dumps({"chat_id": cfg.telegram_chat_id, "text": text[start:start + 4000]}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=20).read()
