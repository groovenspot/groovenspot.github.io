"""보고 보내기. 카카오톡·텔레그램 중 설정된 곳으로 보내고, 항상 터미널·로그에도 남긴다."""
from __future__ import annotations

import json
import os
import traceback
import urllib.request

from . import kakao
from .config import Config


def _telegram(cfg: Config, token: str, text: str) -> None:
    # 텔레그램 메시지 한도 4096자
    for start in range(0, len(text), 4000):
        payload = json.dumps({"chat_id": cfg.telegram_chat_id, "text": text[start:start + 4000]}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=20).read()


def send(cfg: Config, title: str, body: str) -> None:
    text = f"[{title}]\n{body}".strip()
    print(text)
    # 보고가 실패해도 작업 자체는 실패로 만들지 않는다 (로그에는 남김)
    if kakao.configured(cfg):
        try:
            kakao.send(cfg, text)
        except Exception:
            traceback.print_exc()
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if token and cfg.telegram_chat_id:
        try:
            _telegram(cfg, token, text)
        except Exception:
            traceback.print_exc()
