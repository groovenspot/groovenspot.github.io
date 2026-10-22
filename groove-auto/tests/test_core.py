import tempfile
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from groove_auto import dashboard
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


if __name__ == "__main__":
    unittest.main()
