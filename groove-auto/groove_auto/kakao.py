"""카카오톡 '나에게 보내기'.

카카오 개발자 앱의 REST API 키로 한 번 로그인(auth kakao)하면
access token(6시간)은 refresh token(2개월, 쓸 때마다 연장)으로 자동 갱신한다.
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from .config import Config

AUTH_URL = "https://kauth.kakao.com/oauth/authorize"
TOKEN_URL = "https://kauth.kakao.com/oauth/token"
MEMO_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send"
TEXT_LIMIT = 200  # 텍스트 템플릿 한 건의 최대 글자 수
MAX_MESSAGES = 5  # 보고 하나가 너무 많은 메시지로 쪼개지지 않게


def _token_path(cfg: Config) -> Path:
    return cfg.data_dir / "kakao_token.json"


def configured(cfg: Config) -> bool:
    return bool(os.environ.get("KAKAO_REST_API_KEY")) and _token_path(cfg).exists()


def _post(url: str, data: dict, headers: dict | None = None) -> dict:
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(), headers=headers or {})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


def _client_fields() -> dict:
    fields = {"client_id": os.environ["KAKAO_REST_API_KEY"]}
    if os.environ.get("KAKAO_CLIENT_SECRET"):
        fields["client_secret"] = os.environ["KAKAO_CLIENT_SECRET"]
    return fields


def authorize(cfg: Config) -> Path:
    """브라우저로 카카오 로그인 → 동의 → 토큰 저장. 맥미니에서 한 번."""
    redirect = cfg.kakao_redirect_uri
    parsed = urllib.parse.urlparse(redirect)
    query = urllib.parse.urlencode({
        "client_id": os.environ["KAKAO_REST_API_KEY"],
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": "talk_message",
    })
    result: dict = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            result.update({k: v[0] for k, v in params.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("카카오 연결 완료. 이 창은 닫아도 됩니다.".encode())

        def log_message(self, *args):
            pass

    server = HTTPServer((parsed.hostname or "localhost", parsed.port or 80), Handler)
    url = f"{AUTH_URL}?{query}"
    print(f"브라우저에서 카카오 로그인: {url}")
    webbrowser.open(url)
    while "code" not in result and "error" not in result:
        server.handle_request()
    server.server_close()
    if "error" in result:
        raise SystemExit(f"카카오 인증 실패: {result}")

    token = _post(TOKEN_URL, {
        "grant_type": "authorization_code",
        "redirect_uri": redirect,
        "code": result["code"],
        **_client_fields(),
    })
    path = _token_path(cfg)
    path.write_text(json.dumps(token), encoding="utf-8")
    return path


def _refresh(cfg: Config) -> str:
    path = _token_path(cfg)
    stored = json.loads(path.read_text(encoding="utf-8"))
    fresh = _post(TOKEN_URL, {
        "grant_type": "refresh_token",
        "refresh_token": stored["refresh_token"],
        **_client_fields(),
    })
    # refresh token 은 만료 1개월 전부터만 새로 내려온다
    stored.update({k: v for k, v in fresh.items() if v})
    path.write_text(json.dumps(stored), encoding="utf-8")
    return stored["access_token"]


def chunks(text: str, limit: int = TEXT_LIMIT, max_messages: int = MAX_MESSAGES) -> list[str]:
    """줄 단위로 limit 글자 이하 메시지로 나눈다. 넘치면 마지막에 생략 표시."""
    parts: list[str] = []
    current = ""
    for line in text.splitlines():
        while len(line) > limit:
            if current:
                parts.append(current)
                current = ""
            parts.append(line[:limit])
            line = line[limit:]
        candidate = f"{current}\n{line}" if current else line
        if len(candidate) > limit:
            parts.append(current)
            current = line
        else:
            current = candidate
    if current:
        parts.append(current)
    if len(parts) > max_messages:
        parts = parts[:max_messages]
        tail = "\n…(나머지는 현황 페이지)"
        parts[-1] = parts[-1][:limit - len(tail)] + tail
    return parts


def send(cfg: Config, text: str) -> None:
    access = _refresh(cfg)
    link = {"web_url": cfg.kakao_link_url, "mobile_web_url": cfg.kakao_link_url} if cfg.kakao_link_url else {}
    for part in chunks(text):
        template = {"object_type": "text", "text": part, "link": link}
        _post(MEMO_URL, {"template_object": json.dumps(template, ensure_ascii=False)},
              {"Authorization": f"Bearer {access}"})
