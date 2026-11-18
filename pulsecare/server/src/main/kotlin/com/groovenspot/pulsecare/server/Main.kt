package com.groovenspot.pulsecare.server

import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import java.time.Clock

/**
 * 환경 변수:
 * - DATABASE_URL (jdbc:postgresql://…), DATABASE_USER, DATABASE_PASSWORD
 * - FCM_PROJECT_ID: 비우면 푸시를 로그로만 남깁니다 (로컬 실행)
 * - APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY(.p8 내용), APNS_TOPIC(기본 com.groovenspot.pulsecare), APNS_SANDBOX(true면 개발용):
 *   아이폰 푸시. 비우면 아이폰 토큰("apns:")으로는 보내지 않습니다.
 * - TICK_SECRET: /internal/tick 호출용 (Cloud Scheduler 헤더 X-Tick-Secret)
 * - ADMIN_PASSWORD: /admin 지표 페이지 비밀번호 (비우면 페이지 없음)
 * - ANTHROPIC_API_KEY: AI 건강 상담 (비우면 상담 꺼짐), CHAT_MODEL: 상담 모델 (기본 claude-opus-5-5)
 * - PORT (기본 8080)
 */
fun main() {
    val env = System.getenv()
    val db = Db.connect(env.getValue("DATABASE_URL"), env["DATABASE_USER"], env["DATABASE_PASSWORD"])
    db.migrate()
    val fcm = env["FCM_PROJECT_ID"]?.takeIf { it.isNotBlank() }?.let(::FcmPush) ?: LogPush()
    val apns = env["APNS_KEY"]?.takeIf { it.isNotBlank() }?.let { key ->
        ApnsPush(
            keyId = env.getValue("APNS_KEY_ID"),
            teamId = env.getValue("APNS_TEAM_ID"),
            privateKeyPem = key,
            topic = env["APNS_TOPIC"]?.takeIf { it.isNotBlank() } ?: "com.groovenspot.pulsecare",
            sandbox = env["APNS_SANDBOX"] == "true",
        )
    }
    val push = RoutingPush(fcm, apns)
    val clock = Clock.systemUTC()
    val services = Services(
        FamilyService(db, push, clock),
        EmergencyService(db, push, clock),
        env["TICK_SECRET"],
        MetricsService(db, clock),
        env["ADMIN_PASSWORD"],
        ChatService(
            db,
            env["ANTHROPIC_API_KEY"]?.takeIf { it.isNotBlank() }?.let { ClaudeChat(env["CHAT_MODEL"]?.takeIf { m -> m.isNotBlank() } ?: "claude-opus-5-5") },
            clock,
        ),
    )

    // 서버가 떠 있는 동안은 15초마다도 진행합니다 (Cloud Scheduler 1분 간격 사이를 메움).
    val log = LoggerFactory.getLogger("tick")
    // 보관 기간 정리는 각 서비스가 한 시간에 한 번으로 스스로 제한합니다.
    CoroutineScope(Dispatchers.IO).launch {
        while (true) {
            delay(15_000)
            runCatching {
                services.emergencies.tick()
                services.family.digest()
                services.family.cleanup()
                services.metrics?.cleanup()
            }.onFailure { log.warn("tick failed", it) }
        }
    }

    embeddedServer(Netty, port = env["PORT"]?.toInt() ?: 8080) { pulsecare(services) }.start(wait = true)
}
