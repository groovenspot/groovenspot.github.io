import json
import os
import tempfile
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from unittest import mock
from zoneinfo import ZoneInfo

from groove_auto import dashboard, kakao, notify
from groove_auto.claude import reply_is_safe
from groove_auto.config import Config
from groove_auto.db import DB
from groove_auto.schedule_rules import Short, plan_shorts

D = date(2026, 11, 1)


def day(n: int) -> date:
    return D + timedelta(days=n)


class PlanShortsTest(unittest.TestCase):
    def test_same_dj_never_back_to_back(self):
        queue = [Short("a", "ZET", "s1"), Short("b", "ZET", "s2"), Short("c", "KEYNA", "s3")]
        plan = plan_shorts(queue, {}, start=D)
        djs = [s.dj for _, s in plan.assigned]
        self.assertEqual(djs, ["ZET", "KEYNA", "ZET"])
        self.assertEqual([d for d, _ in plan.assigned], [day(0), day(1), day(2)])

    def test_same_song_kept_three_days_apart(self):
        queue = [Short("a", "ZET", "Song"), Short("b", "KEYNA", "song"), Short("c", "DIA", "x"), Short("d", "MAD", "y")]
        plan = plan_shorts(queue, {}, start=D, same_song_gap_days=3)
        when = {s.video_id: d for d, s in plan.assigned}
        self.assertGreaterEqual((when["b"] - when["a"]).days, 3)

    def test_respects_existing_schedule_neighbors(self):
        scheduled = {day(0): Short("x", "ZET", "old")}
        plan = plan_shorts([Short("a", "ZET", "new"), Short("b", "DIA", "n2")], scheduled, start=day(1))
        self.assertEqual(plan.assigned[0], (day(1), Short("b", "DIA", "n2")))
        self.assertEqual(plan.assigned[1], (day(2), Short("a", "ZET", "new")))

    def test_fills_gap_between_scheduled_days(self):
        scheduled = {day(0): Short("x", "ZET", "s1"), day(2): Short("y", "KEYNA", "s2")}
        plan = plan_shorts([Short("a", "DIA", "s3")], scheduled, start=day(0))
        self.assertEqual(plan.assigned, [(day(1), Short("a", "DIA", "s3"))])

    def test_stops_instead_of_leaving_holes(self):
        plan = plan_shorts([Short("a", "ZET", "s"), Short("b", "ZET", "t")], {}, start=D)
        self.assertEqual(len(plan.assigned), 1)
        self.assertEqual([s.video_id for s in plan.leftover], ["b"])


class ReplySafetyTest(unittest.TestCase):
    def test_blocks_forbidden_names_and_links(self):
        self.assertTrue(reply_is_safe("감사합니다! 🔥", ["홍길동"]))
        self.assertFalse(reply_is_safe("홍길동 DJ 최고죠", ["홍길동"]))
        self.assertFalse(reply_is_safe("see https://x.com", []))
        self.assertFalse(reply_is_safe("", []))


class DbAndDashboardTest(unittest.TestCase):
    def test_round_trip_and_render(self):
        with tempfile.TemporaryDirectory() as tmp:
            tz = ZoneInfo("Asia/Seoul")
            cfg = Config(tz=tz, data_dir=Path(tmp), client_secret=Path(tmp), youtube_token=Path(tmp),
                         gmail_token=Path(tmp), channel_title="GROOVE CLUB BUSAN")
            db = DB(cfg.db_path)
            now = datetime(2026, 10, 23, 16, 10, tzinfo=tz)
            db.save_stats(date(2026, 10, 22), 119, 38331, 400, {})
            db.save_stats(date(2026, 10, 23), 121, 38900, 401, {"28d": {"views": 9000, "minutes": 1, "subs_net": 3}})
            self.assertEqual(db.stats_before(date(2026, 10, 23))["subscribers"], 119)
            db.mark_comment("c1", "v1", "fan", "<b>최고</b>", "positive", "replied", "감사합니다", now)
            self.assertTrue(db.comment_handled("c1"))
            db.add_short("v9", "ZET", "Song <1>", now)
            db.log_run("yt-daily", now, True, "ok")
            html = dashboard.render(cfg, db, now)
            self.assertIn("121", html)
            self.assertIn("&lt;b&gt;최고&lt;/b&gt;", html)  # 댓글 내용은 이스케이프
            self.assertIn("Song &lt;1&gt;", html)
            self.assertIn("유튜브 일일 결산", html)
            db.close()


class KakaoTest(unittest.TestCase):
    def test_chunks_fit_limit_and_cap(self):
        text = "\n".join(f"line {i} " + "가" * 50 for i in range(30))
        parts = kakao.chunks(text)
        self.assertEqual(len(parts), kakao.MAX_MESSAGES)
        self.assertTrue(all(len(p) <= kakao.TEXT_LIMIT for p in parts))
        self.assertTrue(parts[-1].endswith("현황 페이지)"))
        self.assertEqual(kakao.chunks("짧은 보고"), ["짧은 보고"])
        self.assertTrue(all(len(p) <= 200 for p in kakao.chunks("x" * 450)))

    def test_send_refreshes_token_and_posts_memo(self):
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(tz=ZoneInfo("Asia/Seoul"), data_dir=Path(tmp), client_secret=Path(tmp),
                         youtube_token=Path(tmp), gmail_token=Path(tmp), channel_title="G")
            (Path(tmp) / "kakao_token.json").write_text(json.dumps({"access_token": "old", "refresh_token": "r1"}))
            calls = []

            def fake_post(url, data, headers=None):
                calls.append((url, data, headers))
                return {"access_token": "new", "refresh_token": None} if url == kakao.TOKEN_URL else {"result_code": 0}

            with mock.patch.dict(os.environ, {"KAKAO_REST_API_KEY": "key"}), \
                    mock.patch.object(kakao, "_post", side_effect=fake_post):
                self.assertTrue(kakao.configured(cfg))
                notify.send(cfg, "테스트", "본문")
            self.assertEqual(calls[0][1]["refresh_token"], "r1")
            self.assertEqual(calls[1][0], kakao.MEMO_URL)
            self.assertEqual(calls[1][2]["Authorization"], "Bearer new")
            self.assertEqual(json.loads(calls[1][1]["template_object"])["text"], "[테스트]\n본문")
            stored = json.loads((Path(tmp) / "kakao_token.json").read_text())
            self.assertEqual(stored, {"access_token": "new", "refresh_token": "r1"})  # 없는 refresh token 은 유지

    def test_send_failure_does_not_raise(self):
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(tz=ZoneInfo("Asia/Seoul"), data_dir=Path(tmp), client_secret=Path(tmp),
                         youtube_token=Path(tmp), gmail_token=Path(tmp), channel_title="G")
            (Path(tmp) / "kakao_token.json").write_text("{}")
            with mock.patch.dict(os.environ, {"KAKAO_REST_API_KEY": "key"}), \
                    mock.patch("sys.stderr"):
                notify.send(cfg, "t", "b")  # 토큰이 깨져 있어도 작업은 계속


if __name__ == "__main__":
    unittest.main()
