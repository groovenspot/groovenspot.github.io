package com.groovenspot.pulsecare.server

import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.install
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory

class Services(val family: FamilyService, val emergencies: EmergencyService, val tickSecret: String?)

fun Application.pulsecare(s: Services) {
    val log = LoggerFactory.getLogger("pulsecare")
    install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true; explicitNulls = false }) }
    install(CallLogging)
    install(StatusPages) {
        exception<ApiError> { call, e -> call.respond(HttpStatusCode.fromValue(e.status), ErrorBody(e.code, e.message)) }
        exception<SerializationException> { call, _ -> call.respond(HttpStatusCode.BadRequest, ErrorBody("BAD_REQUEST", "요청 형식이 맞지 않아요")) }
        exception<io.ktor.server.plugins.BadRequestException> { call, _ ->
            call.respond(HttpStatusCode.BadRequest, ErrorBody("BAD_REQUEST", "요청 형식이 맞지 않아요"))
        }
        exception<Throwable> { call, e ->
            log.error("Unhandled", e)
            call.respond(HttpStatusCode.InternalServerError, ErrorBody("SERVER", "잠시 후 다시 시도해 주세요"))
        }
    }

    suspend fun ApplicationCall.user(): String {
        val token = request.headers["Authorization"]?.removePrefix("Bearer ")?.trim()
        return token?.let { s.family.auth(it) } ?: throw ApiError(401, "UNAUTHORIZED", "다시 로그인해 주세요")
    }

    routing {
        get("/healthz") { call.respond(mapOf("ok" to true)) }

        route("/v1") {
            post("/users") { call.respond(s.family.signUp(call.receive<SignUpRequest>().name)) }
            get("/me") { call.respond(s.family.me(call.user())) }
            put("/me") {
                val u = call.user()
                s.family.updateMe(u, call.receive())
                call.respond(s.family.me(u))
            }
            delete("/me") {
                s.family.deleteMe(call.user())
                call.respond(HttpStatusCode.NoContent)
            }

            post("/invites") { call.respond(s.family.invite(call.user(), call.receive<InviteRequest>().role)) }
            get("/invites/{code}") {
                call.user()
                call.respond(s.family.preview(call.parameters["code"]!!))
            }
            post("/invites/accept") { call.respond(s.family.accept(call.user(), call.receive<AcceptRequest>().code)) }

            get("/family") { call.respond(s.family.family(call.user())) }
            delete("/family/{userId}") {
                val u = call.user()
                s.family.unlink(u, call.parameters["userId"]!!)
                call.respond(s.family.family(u))
            }
            put("/family/order") {
                val u = call.user()
                s.family.order(u, call.receive<OrderRequest>().guardianIds)
                call.respond(s.family.family(u))
            }

            post("/summaries") {
                s.family.upload(call.user(), call.receive())
                call.respond(HttpStatusCode.NoContent)
            }

            post("/emergencies") { call.respond(s.emergencies.create(call.user(), call.receive<EmergencyRequest>().signal)) }
            get("/emergencies/{id}") { call.respond(s.emergencies.view(call.user(), call.parameters["id"]!!)) }
            post("/emergencies/{id}/ack") {
                val u = call.user()
                s.emergencies.ack(u, call.parameters["id"]!!)
                call.respond(s.emergencies.view(u, call.parameters["id"]!!))
            }
            post("/emergencies/{id}/cancel") {
                val u = call.user()
                s.emergencies.cancel(u, call.parameters["id"]!!)
                call.respond(s.emergencies.view(u, call.parameters["id"]!!))
            }
        }

        // Cloud Scheduler가 1분마다 부릅니다: 긴급 단계 진행, 저녁 8시 보호자 요약, 보관 기간 지난 기록 삭제.
        post("/internal/tick") {
            if (s.tickSecret.isNullOrEmpty() || call.request.headers["X-Tick-Secret"] != s.tickSecret) {
                throw ApiError(404, "NOT_FOUND", "없는 주소예요")
            }
            s.emergencies.tick()
            s.family.digest()
            s.family.cleanup()
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
