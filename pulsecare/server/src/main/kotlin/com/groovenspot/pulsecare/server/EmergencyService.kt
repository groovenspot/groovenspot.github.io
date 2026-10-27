package com.groovenspot.pulsecare.server

import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.EmergencyEscalation
import com.groovenspot.pulsecare.alert.EmergencyEscalation.Action
import com.groovenspot.pulsecare.alert.Signal
import java.sql.Connection
import java.time.Clock
import java.time.Duration
import java.util.UUID

/**
 * 긴급 연락 (기획서 12번, [EmergencyEscalation]): SOS는 바로, 낙상은 본인에게 60초를 준 뒤
 * 보호자에게 우선순위 순서로 1분 간격, 3분 안에 아무도 확인하지 않으면 전원에게 다시.
 * 누군가 확인하거나 본인이 취소하면 남은 단계는 멈춥니다. 119 자동 신고는 하지 않습니다.
 *
 * 단계는 요청 때 한 번, 그 뒤로는 [tick]이 (Cloud Scheduler 1분마다 + 서버 안 15초마다) 진행합니다.
 */
class EmergencyService(private val db: Db, private val push: Push, private val clock: Clock) {

    fun create(wearerId: String, signalName: String): EmergencyCreated {
        val signal = Signal.entries.firstOrNull { it.name == signalName && (it == Signal.SOS || it == Signal.FALL) }
            ?: throw ApiError(400, "BAD_SIGNAL", "긴급 신호는 SOS와 낙상만 받아요")
        val (id, count) = db.tx {
            // 연달아 누른 SOS는 하나로 봅니다.
            query(
                "select id, guardians from emergencies where wearer_id = ? and status = ? and created_at > ?",
                wearerId, ACTIVE, clock.millis() - DUPLICATE_WINDOW.toMillis(),
            ) { it.getString("id") to split(it.getString("guardians")).size }.firstOrNull()?.let { return@tx it }
            val guardians = query("select guardian_id from links where wearer_id = ? order by priority", wearerId) { it.getString("guardian_id") }
            val id = UUID.randomUUID().toString()
            exec(
                "insert into emergencies (id, wearer_id, signal, created_at, guardians, steps_done, notified, status) values (?, ?, ?, ?, ?, 0, '', ?)",
                id, wearerId, signal.name, clock.millis(), guardians.joinToString(","), ACTIVE,
            )
            id to guardians.size
        }
        advance(id)
        return EmergencyCreated(id, count)
    }

    /** 보호자가 "확인했어요". 본인과 다른 보호자에게 누가 확인했는지 알립니다. */
    fun ack(guardianId: String, id: String) = close(id, guardianId, ACKED) { row, by ->
        if (guardianId !in row.guardians) throw ApiError(403, "NOT_GUARDIAN", "이 알림의 보호자가 아니에요")
        listOf(row.wearerId to PushMessage(PushMessage.EMERGENCY_ACK, "${by.name}님이 확인했어요", "곧 연락이 갈 거예요.", mapOf("emergencyId" to id))) +
            (row.notified - guardianId).map {
                it to PushMessage(PushMessage.EMERGENCY_CLOSED, "${by.name}님이 확인했어요", "${row.wearerName}님의 긴급 알림을 ${by.name}님이 확인했어요.", mapOf("emergencyId" to id))
            }
    }

    /** 본인이 "취소하기" (잘못 눌렀거나 괜찮을 때). 이미 알린 보호자에게 알립니다. */
    fun cancel(wearerId: String, id: String) = close(id, wearerId, CANCELLED) { row, _ ->
        if (wearerId != row.wearerId) throw ApiError(403, "NOT_WEARER", "본인만 취소할 수 있어요")
        row.notified.map {
            it to PushMessage(PushMessage.EMERGENCY_CLOSED, "${row.wearerName}님이 괜찮다고 했어요", "${row.wearerName}님이 도움 요청을 취소했어요.", mapOf("emergencyId" to id))
        }
    }

    fun view(userId: String, id: String): EmergencyView = db.tx {
        val row = load(id) ?: throw ApiError(404, "NO_EMERGENCY", "긴급 알림을 찾을 수 없어요")
        if (userId != row.wearerId && userId !in row.guardians) throw ApiError(403, "NOT_FAMILY", "가족만 볼 수 있어요")
        row.view()
    }

    /** 진행 중인 긴급 건의 남은 단계를 시간이 된 만큼 실행합니다. 24시간 지난 건은 닫습니다. */
    fun tick() {
        val ids = db.tx { query("select id from emergencies where status = ?", ACTIVE) { it.getString("id") } }
        ids.forEach(::advance)
    }

    private fun advance(id: String) {
        val sends = db.tx {
            // 동시에 도는 tick이 같은 단계를 두 번 보내지 않도록 행을 잠급니다.
            val row = load(id, lock = true)?.takeIf { it.status == ACTIVE } ?: return@tx emptyList()
            val elapsed = Duration.ofMillis(clock.millis() - row.createdAt)
            if (elapsed > EXPIRE) {
                exec("update emergencies set status = ?, closed_at = ? where id = ?", EXPIRED, clock.millis(), id)
                return@tx emptyList()
            }
            val plan = EmergencyEscalation.plan(row.signal, row.guardians)
            val due = plan.drop(row.stepsDone).takeWhile { it.afterSeconds <= elapsed.seconds }
            if (due.isEmpty()) return@tx emptyList()
            val message = row.view().let { v -> PushMessage(PushMessage.EMERGENCY, v.title, v.body, row.extras()) }
            val out = due.flatMap { step ->
                when (step.action) {
                    Action.ASK_SELF -> emptyList() // 워치가 본인에게 먼저 묻습니다.
                    Action.NOTIFY -> step.guardians.map { it to message }
                    Action.NOTIFY_ALL_AGAIN -> step.guardians.map { it to message.copy(body = "아직 아무도 확인하지 않았어요. " + message.body) }
                }
            }
            val notified = (row.notified + out.map { it.first }).distinct()
            exec("update emergencies set steps_done = ?, notified = ? where id = ?", row.stepsDone + due.size, notified.joinToString(","), id)
            out.mapNotNull { (user, m) -> pushToken(user)?.let { it to m } }
        }
        sends.forEach { (token, m) -> push.send(token, m) }
    }

    private fun close(id: String, by: String, status: String, notify: (Row, Person) -> List<Pair<String, PushMessage>>) {
        val sends = db.tx {
            val row = load(id, lock = true) ?: throw ApiError(404, "NO_EMERGENCY", "긴급 알림을 찾을 수 없어요")
            val messages = notify(row, person(by))
            if (row.status != ACTIVE) return@tx emptyList()
            exec("update emergencies set status = ?, closed_by = ?, closed_at = ? where id = ?", status, by, clock.millis(), id)
            messages.mapNotNull { (user, m) -> pushToken(user)?.let { it to m } }
        }
        sends.forEach { (token, m) -> push.send(token, m) }
    }

    private class Row(
        val id: String,
        val wearerId: String,
        val wearerName: String,
        val wearerPhone: String?,
        val signal: Signal,
        val createdAt: Long,
        val guardians: List<String>,
        val stepsDone: Int,
        val notified: List<String>,
        val status: String,
        val closedBy: String?,
    ) {
        fun view(): EmergencyView {
            val m = AlertText.forGuardian(Detection(signal), wearerName)
            return EmergencyView(id, wearerId, signal.name, createdAt, status, m.title, m.body, closedBy)
        }

        fun extras() = buildMap {
            put("emergencyId", id)
            put("wearerId", wearerId)
            wearerPhone?.let { put("phone", it) }
        }
    }

    private fun Connection.load(id: String, lock: Boolean = false): Row? = query(
        "select e.*, u.name, u.phone from emergencies e join users u on u.id = e.wearer_id where e.id = ?" + if (lock) " for update of e" else "",
        id,
    ) {
        Row(
            id = it.getString("id"),
            wearerId = it.getString("wearer_id"),
            wearerName = it.getString("name"),
            wearerPhone = it.getString("phone"),
            signal = Signal.valueOf(it.getString("signal")),
            createdAt = it.getLong("created_at"),
            guardians = split(it.getString("guardians")),
            stepsDone = it.getInt("steps_done"),
            notified = split(it.getString("notified")),
            status = it.getString("status"),
            closedBy = it.getString("closed_by"),
        )
    }.firstOrNull()

    companion object {
        const val ACTIVE = "ACTIVE"
        const val ACKED = "ACKED"
        const val CANCELLED = "CANCELLED"
        const val EXPIRED = "EXPIRED"
        private val DUPLICATE_WINDOW = Duration.ofMinutes(10)
        private val EXPIRE = Duration.ofHours(24)
        /** 가족 탭에 닫힌 건을 잠깐 더 보여줍니다 ("엄마가 괜찮다고 했어요"). */
        private val SHOW_CLOSED = Duration.ofMinutes(30)

        private fun split(s: String): List<String> = s.split(",").filter { it.isNotEmpty() }

        /** 가족 탭: 진행 중이거나 30분 안에 닫힌 건. */
        fun recent(c: Connection, wearer: Person, now: Long): List<EmergencyView> = c.query(
            "select * from emergencies where wearer_id = ? and (status = ? or closed_at > ?) order by created_at desc",
            wearer.userId, ACTIVE, now - SHOW_CLOSED.toMillis(),
        ) {
            val signal = Signal.valueOf(it.getString("signal"))
            val m = AlertText.forGuardian(Detection(signal), wearer.name)
            EmergencyView(it.getString("id"), wearer.userId, signal.name, it.getLong("created_at"), it.getString("status"), m.title, m.body, it.getString("closed_by"))
        }
    }
}
