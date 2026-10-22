"""숏츠 예약 규칙: 하루 1개, 같은 DJ 연속 금지, 같은 곡 N일 안 금지.

유튜브 API와 무관한 순수 계산이라 테스트로 검증한다.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class Short:
    video_id: str
    dj: str
    song: str


@dataclass
class Plan:
    assigned: list[tuple[date, Short]]
    leftover: list[Short]  # 규칙 때문에 넣을 날이 없는 항목


def _norm(s: str) -> str:
    return " ".join(s.lower().split())


def plan_shorts(
    queue: list[Short],
    scheduled: dict[date, Short],
    start: date,
    same_song_gap_days: int = 3,
) -> Plan:
    """queue 순서를 최대한 지키면서 start 이후 빈 날짜에 하나씩 배정한다.

    scheduled 는 이미 예약된 날짜. 이미 예약된 날 사이 빈 날도 채우며,
    그때는 앞뒤 날짜 모두와 규칙을 확인한다. 어떤 후보도 규칙에 맞지 않는
    날이 나오면 거기서 멈춘다 (빈 날을 건너뛰면 하루 1개 규칙이 깨지므로).
    """
    taken = dict(scheduled)
    remaining = list(queue)
    assigned: list[tuple[date, Short]] = []

    def fits(day: date, s: Short) -> bool:
        for neighbor in (day - timedelta(days=1), day + timedelta(days=1)):
            other = taken.get(neighbor)
            if other and _norm(other.dj) == _norm(s.dj):
                return False
        for offset in range(-(same_song_gap_days - 1), same_song_gap_days):
            other = taken.get(day + timedelta(days=offset))
            if other and offset != 0 and _norm(other.song) == _norm(s.song):
                return False
        return True

    day = start
    last_taken = max(taken) if taken else start
    while remaining:
        if day in taken:
            day += timedelta(days=1)
            continue
        pick = next((s for s in remaining if fits(day, s)), None)
        if pick is None:
            # 이미 예약된 구간 안의 빈 날이면 다음 날로 넘어가 본다
            if day < last_taken:
                day += timedelta(days=1)
                continue
            break
        taken[day] = pick
        assigned.append((day, pick))
        remaining.remove(pick)
        day += timedelta(days=1)
    return Plan(assigned=assigned, leftover=remaining)
