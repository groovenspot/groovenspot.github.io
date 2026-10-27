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
 * - TICK_SECRET: /internal/tick 호출용 (Cloud Scheduler 헤더 X-Tick-Secret)
 * - PORT (기본 8080)
 */
fun main() {
    val env = System.getenv()
    val db = Db.connect(env.getValue("DATABASE_URL"), env["DATABASE_USER"], env["DATABASE_PASSWORD"])
    db.migrate()
    val push = env["FCM_PROJECT_ID"]?.takeIf { it.isNotBlank() }?.let(::FcmPush) ?: LogPush()
    val clock = Clock.systemUTC()
    val services = Services(FamilyService(db, push, clock), EmergencyService(db, push, clock), env["TICK_SECRET"])

    // 서버가 떠 있는 동안은 15초마다도 진행합니다 (Cloud Scheduler 1분 간격 사이를 메움).
    val log = LoggerFactory.getLogger("tick")
    CoroutineScope(Dispatchers.IO).launch {
        while (true) {
            delay(15_000)
            runCatching {
                services.emergencies.tick()
                services.family.digest()
                services.family.cleanup()
            }.onFailure { log.warn("tick failed", it) }
        }
    }

    embeddedServer(Netty, port = env["PORT"]?.toInt() ?: 8080) { pulsecare(services) }.start(wait = true)
}
