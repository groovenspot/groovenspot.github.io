"""config.toml 읽기."""
from __future__ import annotations

import tomllib
from dataclasses import dataclass, field
from datetime import time
from pathlib import Path
from zoneinfo import ZoneInfo

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "config.toml"


def _path(value: str) -> Path:
    return Path(value).expanduser()


@dataclass
class Config:
    tz: ZoneInfo
    data_dir: Path
    client_secret: Path
    youtube_token: Path
    gmail_token: Path
    channel_title: str
    auto_reply: bool = True
    lookback_hours: int = 48
    model: str = "claude-opus-5-5"
    effort: str = "medium"
    forbidden_words: list[str] = field(default_factory=list)
    publish_time: time = time(15, 0)
    same_song_gap_days: int = 3
    dj_playlists: dict[str, str] = field(default_factory=dict)
    gmail_watches: list[dict] = field(default_factory=list)
    telegram_chat_id: str = ""

    @property
    def db_path(self) -> Path:
        return self.data_dir / "groove.db"


def load(path: Path | None = None) -> Config:
    path = path or DEFAULT_PATH
    if not path.exists():
        raise SystemExit(f"설정 파일이 없습니다: {path}\nconfig.example.toml 을 config.toml 로 복사해서 채우세요.")
    raw = tomllib.loads(path.read_text(encoding="utf-8"))
    paths = raw.get("paths", {})
    yt = raw.get("youtube", {})
    comments = raw.get("comments", {})
    shorts = raw.get("shorts", {})
    hh, mm = shorts.get("publish_time", "15:00").split(":")
    cfg = Config(
        tz=ZoneInfo(raw.get("timezone", "Asia/Seoul")),
        data_dir=_path(paths.get("data_dir", "./data")),
        client_secret=_path(paths["client_secret"]),
        youtube_token=_path(paths["youtube_token"]),
        gmail_token=_path(paths["gmail_token"]),
        channel_title=yt["channel_title"],
        auto_reply=comments.get("auto_reply", True),
        lookback_hours=comments.get("lookback_hours", 48),
        model=comments.get("model", "claude-opus-5-5"),
        effort=comments.get("effort", "medium"),
        forbidden_words=list(comments.get("forbidden_words", [])),
        publish_time=time(int(hh), int(mm)),
        same_song_gap_days=shorts.get("same_song_gap_days", 3),
        dj_playlists=dict(shorts.get("dj_playlists", {})),
        gmail_watches=list(raw.get("gmail", {}).get("watch", [])),
        telegram_chat_id=str(raw.get("telegram", {}).get("chat_id", "")),
    )
    cfg.data_dir.mkdir(parents=True, exist_ok=True)
    return cfg
