-- 커뮤니티 금지 표현에서 '합배송' 단어 전체 차단을 '모집' 표현만 막도록 좁힙니다.
-- 내 주문을 배송대행지에서 한 상자로 받는 합배송(합배송 견적 기능) 이야기는 허용하고, 사람을 모으는 공동구매 글은 계속 막습니다.
UPDATE "Setting"
SET value = jsonb_set(
  value,
  '{bannedPatterns}',
  (SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) FROM jsonb_array_elements(value->'bannedPatterns') e WHERE e <> '"합배송"'::jsonb)
    || '["같이\\s*합배송", "합배송\\s*(모집|구해|하실|참여|함께)"]'::jsonb
)
WHERE key = 'community' AND value->'bannedPatterns' @> '["합배송"]'::jsonb;
