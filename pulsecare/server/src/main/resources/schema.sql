-- 펄스케어 가족 서버. 건강 원수치는 받지 않고, 보호자에게 보여줄 하루 요약(점수·미션·알림 문구)만 둡니다.
create table if not exists users (
    id text primary key,
    token_hash text not null unique,
    name text not null,
    phone text,
    push_token text,
    created_at bigint not null
);

-- 초대 코드: 7일 유효, 한 번만. inviter_role은 초대한 사람이 맡을 역할 (GUARDIAN: 보호자가 부모님을 초대).
create table if not exists invites (
    code text primary key,
    inviter_id text not null references users(id) on delete cascade,
    inviter_role text not null,
    expires_at bigint not null,
    used_by text
);

-- 착용자(부모님)와 보호자. priority가 작을수록 먼저 연락합니다.
create table if not exists links (
    wearer_id text not null references users(id) on delete cascade,
    guardian_id text not null references users(id) on delete cascade,
    priority int not null,
    created_at bigint not null,
    primary key (wearer_id, guardian_id)
);

-- 하루 요약. alerts는 보호자용 문구 JSON 배열 [{signal,title,body}].
create table if not exists summaries (
    wearer_id text not null references users(id) on delete cascade,
    day text not null,
    score int,
    band text,
    mission_title text not null,
    mission_done boolean not null,
    alerts text not null,
    updated_at bigint not null,
    primary key (wearer_id, day)
);

-- 보호자에게 같은 날 같은 알림을 두 번 보내지 않도록.
create table if not exists sent (
    wearer_id text not null references users(id) on delete cascade,
    guardian_id text not null references users(id) on delete cascade,
    day text not null,
    kind text not null,
    primary key (wearer_id, guardian_id, day, kind)
);

-- 긴급 (SOS·낙상). guardians는 만든 시점의 연락 순서(쉼표 구분), steps_done은 실행한 단계 수.
create table if not exists emergencies (
    id text primary key,
    wearer_id text not null references users(id) on delete cascade,
    signal text not null,
    created_at bigint not null,
    guardians text not null,
    steps_done int not null,
    notified text not null,
    status text not null,
    closed_by text,
    closed_at bigint
);
create index if not exists emergencies_active on emergencies (status);
;

-- 1년 동안 쓰지 않은 계정은 지웁니다 (앱만 지우고 탈퇴하지 않은 경우).
alter table users add column if not exists last_seen bigint
;

-- 이용 통계 (선택 동의). 계정과 분리된 무작위 설치 ID로만 모읍니다. 13개월 보관.
create table if not exists events (
    install_id text not null,
    name text not null,
    at bigint not null,
    day date not null,
    props jsonb not null,
    received_at bigint not null
);
create index if not exists events_day on events (day, name);
create index if not exists events_install on events (install_id, day);

-- 지표 계산용 요약: 활성인 날, 가입한 날.
create table if not exists active_days (
    install_id text not null,
    day date not null,
    primary key (install_id, day)
);
create table if not exists signups (
    install_id text primary key,
    day date not null
);

-- 기록 지우기로 통계를 지운 수 (ID 없이 날짜별 개수만).
create table if not exists forgotten (
    day date primary key,
    count int not null
)
;

-- 가입 방식: watch(워치 연결) / guardian(워치 없는 보호자). 워치 연동률·첫 점수 도달률에서 보호자 전용은 뺍니다.
alter table signups add column if not exists mode text
;

-- AI 상담 사용량 (설치 ID별 하루 질문 수). 대화 내용은 저장하지 않습니다.
create table if not exists chat_usage (
    install_id text not null,
    day date not null,
    count int not null,
    primary key (install_id, day)
)
;

-- 새 폰으로 계정 옮기기: 10분, 한 번만. 쓰면 옛 폰 토큰은 더 이상 통하지 않습니다.
create table if not exists transfers (
    code text primary key,
    user_id text not null references users(id) on delete cascade,
    expires_at bigint not null
)
