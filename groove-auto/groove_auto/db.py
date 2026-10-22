"""상태 저장 (SQLite). 일일 수치, 처리한 댓글·메일, 숏츠 예약 큐, 실행 기록."""
from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS daily_stats (
    day TEXT PRIMARY KEY,
    subscribers INTEGER, views INTEGER, videos INTEGER,
    extra TEXT
);
CREATE TABLE IF NOT EXISTS handled_comments (
    comment_id TEXT PRIMARY KEY,
    video_id TEXT, author TEXT, text TEXT,
    category TEXT, action TEXT, reply TEXT,
    handled_at TEXT
);
CREATE TABLE IF NOT EXISTS seen_mail (
    message_id TEXT PRIMARY KEY,
    watch TEXT, subject TEXT, seen_at TEXT
);
CREATE TABLE IF NOT EXISTS shorts (
    video_id TEXT PRIMARY KEY,
    dj TEXT NOT NULL, song TEXT NOT NULL,
    added_at TEXT NOT NULL,
    publish_day TEXT,          -- 예약된 날짜 (YYYY-MM-DD), 아직 없으면 NULL
    applied INTEGER DEFAULT 0  -- 유튜브에 예약·재생목록 반영 완료
);
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT, started_at TEXT, ok INTEGER, summary TEXT
);
"""


class DB:
    def __init__(self, path: Path | str):
        self.conn = sqlite3.connect(str(path))
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    def close(self) -> None:
        self.conn.close()

    # 실행 기록
    def log_run(self, task: str, started: datetime, ok: bool, summary: str) -> None:
        with self.conn:
            self.conn.execute(
                "INSERT INTO runs (task, started_at, ok, summary) VALUES (?,?,?,?)",
                (task, started.isoformat(timespec="seconds"), int(ok), summary),
            )

    def last_runs(self) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT task, started_at, ok, summary FROM runs WHERE id IN "
            "(SELECT MAX(id) FROM runs GROUP BY task) ORDER BY task"
        ).fetchall()

    # 일일 수치
    def save_stats(self, day: date, subscribers: int, views: int, videos: int, extra: dict) -> None:
        with self.conn:
            self.conn.execute(
                "INSERT OR REPLACE INTO daily_stats VALUES (?,?,?,?,?)",
                (day.isoformat(), subscribers, views, videos, json.dumps(extra, ensure_ascii=False)),
            )

    def stats_before(self, day: date) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT * FROM daily_stats WHERE day < ? ORDER BY day DESC LIMIT 1", (day.isoformat(),)
        ).fetchone()

    def recent_stats(self, limit: int = 14) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM daily_stats ORDER BY day DESC LIMIT ?", (limit,)
        ).fetchall()

    # 댓글
    def comment_handled(self, comment_id: str) -> bool:
        return self.conn.execute(
            "SELECT 1 FROM handled_comments WHERE comment_id = ?", (comment_id,)
        ).fetchone() is not None

    def mark_comment(self, comment_id: str, video_id: str, author: str, text: str,
                     category: str, action: str, reply: str, when: datetime) -> None:
        with self.conn:
            self.conn.execute(
                "INSERT OR REPLACE INTO handled_comments VALUES (?,?,?,?,?,?,?,?)",
                (comment_id, video_id, author, text, category, action, reply,
                 when.isoformat(timespec="seconds")),
            )

    def recent_comments(self, limit: int = 20) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM handled_comments ORDER BY handled_at DESC LIMIT ?", (limit,)
        ).fetchall()

    # 메일
    def mail_seen(self, message_id: str) -> bool:
        return self.conn.execute(
            "SELECT 1 FROM seen_mail WHERE message_id = ?", (message_id,)
        ).fetchone() is not None

    def mark_mail(self, message_id: str, watch: str, subject: str, when: datetime) -> None:
        with self.conn:
            self.conn.execute(
                "INSERT OR IGNORE INTO seen_mail VALUES (?,?,?,?)",
                (message_id, watch, subject, when.isoformat(timespec="seconds")),
            )

    # 숏츠 큐
    def add_short(self, video_id: str, dj: str, song: str, when: datetime) -> None:
        with self.conn:
            self.conn.execute(
                "INSERT OR REPLACE INTO shorts (video_id, dj, song, added_at) VALUES (?,?,?,?)",
                (video_id, dj, song, when.isoformat(timespec="seconds")),
            )

    def add_scheduled_short(self, video_id: str, dj: str, song: str, day: date, when: datetime) -> None:
        """이미 유튜브에 예약돼 있는 숏츠를 기록만 한다 (규칙 계산에 쓰임)."""
        with self.conn:
            self.conn.execute(
                "INSERT OR REPLACE INTO shorts VALUES (?,?,?,?,?,1)",
                (video_id, dj, song, when.isoformat(timespec="seconds"), day.isoformat()),
            )

    def shorts(self) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM shorts ORDER BY COALESCE(publish_day, '9999'), added_at"
        ).fetchall()

    def set_publish_day(self, video_id: str, day: date) -> None:
        with self.conn:
            self.conn.execute(
                "UPDATE shorts SET publish_day = ? WHERE video_id = ?", (day.isoformat(), video_id)
            )

    def mark_applied(self, video_id: str) -> None:
        with self.conn:
            self.conn.execute("UPDATE shorts SET applied = 1 WHERE video_id = ?", (video_id,))
