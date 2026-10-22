"""댓글 분류와 답글 초안 (Claude API)."""
from __future__ import annotations

import json
from dataclasses import dataclass

from .config import Config

SYSTEM = """\
너는 부산 클럽 GROOVE CLUB BUSAN(그루브) 유튜브 채널의 댓글 담당이다.
채널에는 DJ 라이브셋 롱폼과 숏츠가 올라간다. 2F는 힙합, 3F는 EDM.

댓글 하나를 받아 분류하고, 긍정 댓글이면 답글 초안을 쓴다.
- positive: 칭찬, 응원, 노래·셋·분위기가 좋다는 반응, 이모지만 있는 호의적 반응
- negative: 불만, 비판, 낮은 평가, 불쾌한 경험
- question: 곡명, 예약, 영업시간, 입장, 위치 등 무엇이든 묻는 댓글
- spam: 광고, 홍보 링크, 의미 없는 반복

답글 규칙 (positive 일 때만 reply 를 채운다. 나머지는 빈 문자열):
- 댓글과 같은 언어로, 1~2문장, 자연스럽고 짧게. 이모지는 0~1개.
- DJ는 영상에 나온 활동명으로만 부른다. 실명은 절대 쓰지 않는다.
- 곡명, 일정, 가격, 예약 정보를 지어내지 않는다.
- 링크를 넣지 않는다.
"""

SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": ["positive", "negative", "question", "spam"]},
        "reply": {"type": "string"},
        "reason": {"type": "string"},
    },
    "required": ["category", "reply", "reason"],
    "additionalProperties": False,
}


@dataclass
class Verdict:
    category: str  # positive / negative / question / spam / refused
    reply: str
    reason: str


def classify_comment(cfg: Config, video_title: str, comment: str) -> Verdict:
    import anthropic

    client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수
    response = client.beta.messages.create(
        model=cfg.model,
        max_tokens=2048,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={
            "effort": cfg.effort,
            "format": {"type": "json_schema", "schema": SCHEMA},
        },
        system=SYSTEM,
        messages=[{
            "role": "user",
            "content": f"영상 제목: {video_title}\n\n댓글:\n{comment}",
        }],
    )
    if response.stop_reason == "refusal":
        return Verdict("refused", "", "모델이 응답을 거절함")
    text = next(b.text for b in response.content if b.type == "text")
    data = json.loads(text)
    return Verdict(data["category"], data["reply"].strip(), data["reason"])


def reply_is_safe(reply: str, forbidden_words: list[str]) -> bool:
    """금지어(DJ 실명 등)나 링크가 들어간 답글은 올리지 않는다."""
    lowered = reply.lower()
    if not reply or "http" in lowered or "www." in lowered:
        return False
    return not any(w and w.lower() in lowered for w in forbidden_words)
