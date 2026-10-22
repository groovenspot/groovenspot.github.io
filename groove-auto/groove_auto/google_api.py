"""구글 OAuth 토큰과 API 클라이언트."""
from __future__ import annotations

from pathlib import Path

from .config import Config

YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.force-ssl",   # 댓글 답글, 예약, 재생목록
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


class WrongChannel(RuntimeError):
    pass


def authorize(cfg: Config, which: str) -> Path:
    """브라우저로 로그인해서 토큰을 저장한다. 맥미니에서 한 번만 하면 된다."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    scopes, token = (YOUTUBE_SCOPES, cfg.youtube_token) if which == "youtube" else (GMAIL_SCOPES, cfg.gmail_token)
    flow = InstalledAppFlow.from_client_secrets_file(str(cfg.client_secret), scopes)
    # 그루브 채널 계정을 고를 수 있도록 계정 선택 화면을 항상 띄운다
    creds = flow.run_local_server(port=0, prompt="select_account consent")
    token.parent.mkdir(parents=True, exist_ok=True)
    token.write_text(creds.to_json(), encoding="utf-8")
    return token


def _credentials(token: Path, scopes: list[str]):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    if not token.exists():
        raise SystemExit(f"토큰이 없습니다: {token}\n`python -m groove_auto auth ...` 를 먼저 실행하세요.")
    creds = Credentials.from_authorized_user_file(str(token), scopes)
    if not creds.valid:
        creds.refresh(Request())
        token.write_text(creds.to_json(), encoding="utf-8")
    return creds


def youtube(cfg: Config):
    from googleapiclient.discovery import build

    return build("youtube", "v3", credentials=_credentials(cfg.youtube_token, YOUTUBE_SCOPES), cache_discovery=False)


def youtube_analytics(cfg: Config):
    from googleapiclient.discovery import build

    return build("youtubeAnalytics", "v2", credentials=_credentials(cfg.youtube_token, YOUTUBE_SCOPES), cache_discovery=False)


def gmail(cfg: Config):
    from googleapiclient.discovery import build

    return build("gmail", "v1", credentials=_credentials(cfg.gmail_token, GMAIL_SCOPES), cache_discovery=False)


def my_channel(yt, cfg: Config) -> dict:
    """토큰의 채널이 그루브 채널인지 확인하고 채널 정보를 돌려준다.

    개인 채널로 인증된 토큰이면 어떤 작업도 하지 않도록 예외를 낸다.
    """
    resp = yt.channels().list(part="snippet,statistics,contentDetails", mine=True).execute()
    items = resp.get("items", [])
    if not items:
        raise WrongChannel("이 토큰에 연결된 유튜브 채널이 없습니다.")
    ch = items[0]
    title = ch["snippet"]["title"]
    if title.strip().lower() != cfg.channel_title.strip().lower():
        raise WrongChannel(f"그루브 채널이 아닙니다: '{title}' (기대값 '{cfg.channel_title}'). 작업을 멈춥니다.")
    return ch
