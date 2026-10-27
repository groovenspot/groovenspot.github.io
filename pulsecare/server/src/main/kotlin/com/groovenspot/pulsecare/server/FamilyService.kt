package com.groovenspot.pulsecare.server

import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.Grade
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.score.Band
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import java.security.MessageDigest
import java.security.SecureRandom
import java.sql.Connection
import java.time.Clock
import java.time.Duration
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.util.Base64
import java.util.UUID

/**
 * 계정, 가족 초대·연결, 하루 요약 (기획서 12번 보호자 알림, 17번 가족 초대).
 * 착용자가 동의한 연결에만 요약이 보이고, 원수치 대신 점수·미션·보호자용 알림 문구만 둡니다.
 */
class FamilyService(
    private val db: Db,
    private val push: Push,
    private val clock: Clock,
    private val zone: ZoneId = ZoneId.of("Asia/Seoul"),
) {
    private val random = SecureRandom()

    // --- 계정 ---

    fun signUp(name: String): SignUpResponse {
        val token = ByteArray(32).also(random::nextBytes).let { Base64.getUrlEncoder().withoutPadding().encodeToString(it) }
        val id = UUID.randomUUID().toString()
        db.tx {
            exec("insert into users (id, token_hash, name, created_at, last_seen) values (?, ?, ?, ?, ?)", id, hash(token), cleanName(name), now(), now())
        }
        return SignUpResponse(id, token)
    }

    /** 토큰으로 사용자를 찾고, 하루에 한 번 마지막 사용 시각을 남깁니다 (1년 미사용 계정 삭제용). */
    fun auth(token: String): String? = db.tx {
        val (id, seen) = query("select id, last_seen from users where token_hash = ?", hash(token)) {
            it.getString("id") to it.getLong("last_seen")
        }.firstOrNull() ?: return@tx null
        if (now() - seen > Duration.ofDays(1).toMillis()) exec("update users set last_seen = ? where id = ?", now(), id)
        id
    }

    fun me(userId: String): Me = db.tx { person(userId) }.let { Me(it.userId, it.name, it.phone) }

    fun updateMe(userId: String, u: UpdateMe) = db.tx {
        u.name?.let { exec("update users set name = ? where id = ?", cleanName(it), userId) }
        u.phone?.let { exec("update users set phone = ? where id = ?", cleanPhone(it), userId) }
        u.pushToken?.let { exec("update users set push_token = ? where id = ?", it.take(4096).ifBlank { null }, userId) }
    }

    /** 탈퇴: 이 사람의 모든 기록과 연결을 지웁니다 (on delete cascade). */
    fun deleteMe(userId: String) = db.tx { exec("delete from users where id = ?", userId) }

    // --- 초대와 연결 ---

    fun invite(userId: String, role: Role): InviteResponse {
        val code = (1..CODE_LENGTH).map { CODE_ALPHABET[random.nextInt(CODE_ALPHABET.length)] }.joinToString("")
        val expires = now() + INVITE_DAYS.toMillis()
        db.tx { exec("insert into invites (code, inviter_id, inviter_role, expires_at) values (?, ?, ?, ?)", code, userId, role.name, expires) }
        return InviteResponse(code, expires)
    }

    fun preview(rawCode: String): InvitePreview = db.tx {
        query(
            "select u.name, i.inviter_role from invites i join users u on u.id = i.inviter_id where i.code = ? and i.used_by is null and i.expires_at > ?",
            normalize(rawCode), now(),
        ) { InvitePreview(it.getString("name"), Role.valueOf(it.getString("inviter_role"))) }.firstOrNull()
    } ?: throw ApiError(404, "INVITE_INVALID", "초대 코드가 맞지 않거나 기한(7일)이 지났어요")

    /**
     * 초대 수락. 착용자 쪽 동의: 착용자가 초대를 만들었거나(만들 때 동의), 착용자가 보호자의 초대를 받는 경우(받을 때 동의).
     * 앱은 두 경우 모두 무엇이 공유되는지 보여주고 동의를 받은 뒤 이 API를 부릅니다.
     */
    fun accept(userId: String, rawCode: String): Family {
        val code = normalize(rawCode)
        val inviter = db.tx {
            val row = query("select inviter_id, inviter_role, expires_at, used_by from invites where code = ? for update", code) {
                Triple(it.getString("inviter_id"), Role.valueOf(it.getString("inviter_role")), it.getLong("expires_at") to it.getString("used_by"))
            }.firstOrNull()
            if (row == null || row.third.second != null || row.third.first < now()) {
                throw ApiError(404, "INVITE_INVALID", "초대 코드가 맞지 않거나 기한(7일)이 지났어요")
            }
            val (inviterId, role) = row
            if (inviterId == userId) throw ApiError(400, "INVITE_SELF", "내가 만든 초대 코드예요. 가족에게 보내 주세요")
            val (wearer, guardian) = if (role == Role.GUARDIAN) userId to inviterId else inviterId to userId
            if (query("select 1 from links where wearer_id = ? and guardian_id = ?", wearer, guardian) { 1 }.isNotEmpty()) {
                throw ApiError(409, "ALREADY_LINKED", "이미 연결된 가족이에요")
            }
            val count = query("select count(*) as n from links where wearer_id = ?", wearer) { it.getInt("n") }.first()
            if (count >= MAX_GUARDIANS) throw ApiError(409, "TOO_MANY_GUARDIANS", "보호자는 ${MAX_GUARDIANS}명까지 연결할 수 있어요")
            exec("insert into links (wearer_id, guardian_id, priority, created_at) values (?, ?, ?, ?)", wearer, guardian, count + 1, now())
            exec("update invites set used_by = ? where code = ?", userId, code)
            inviterId
        }
        val (acceptor, inviterPush) = db.tx { person(userId) to pushToken(inviter) }
        inviterPush?.let { push.send(it, PushMessage(PushMessage.LINKED, "${acceptor.name}님과 연결됐어요", "이제 가족 탭에서 함께 볼 수 있어요.")) }
        return family(userId)
    }

    fun family(userId: String): Family = db.tx {
        val guardians = query(
            "select u.id, u.name, u.phone, l.priority from links l join users u on u.id = l.guardian_id where l.wearer_id = ? order by l.priority",
            userId,
        ) { GuardianView(Person(it.getString("id"), it.getString("name"), it.getString("phone")), it.getInt("priority")) }
        val day = today().toString()
        val wearers = query(
            "select u.id, u.name, u.phone from links l join users u on u.id = l.wearer_id where l.guardian_id = ? order by l.created_at",
            userId,
        ) { Person(it.getString("id"), it.getString("name"), it.getString("phone")) }.map { p ->
            WearerView(p, summary(p.userId, day), EmergencyService.recent(this, p, now()))
        }
        Family(guardians, wearers)
    }

    /** 연결 끊기: 착용자·보호자 누구나. */
    fun unlink(userId: String, otherId: String) = db.tx {
        val n = exec(
            "delete from links where (wearer_id = ? and guardian_id = ?) or (wearer_id = ? and guardian_id = ?)",
            userId, otherId, otherId, userId,
        )
        if (n == 0) throw ApiError(404, "NOT_LINKED", "연결된 가족이 아니에요")
        // 보호자가 끊었으면 착용자 쪽 순서가 비므로 양쪽 모두 다시 매깁니다.
        renumber(userId)
        renumber(otherId)
    }

    /** 착용자가 보호자 연락 순서를 정합니다. */
    fun order(userId: String, guardianIds: List<String>) = db.tx {
        val current = query("select guardian_id from links where wearer_id = ?", userId) { it.getString("guardian_id") }.toSet()
        if (guardianIds.toSet() != current || guardianIds.size != current.size) throw ApiError(400, "BAD_ORDER", "보호자 목록이 바뀌었어요. 다시 열어 주세요")
        guardianIds.forEachIndexed { i, g -> exec("update links set priority = ? where wearer_id = ? and guardian_id = ?", i + 1, userId, g) }
    }

    // --- 하루 요약 ---

    /** 폰이 아침·저녁에 올리는 오늘 요약. 활동량 급감은 보호자에게 바로, 나머지는 저녁 8시 요약으로 (12번). */
    fun upload(userId: String, s: SummaryUpload) {
        val day = runCatching { LocalDate.parse(s.day) }.getOrNull() ?: throw ApiError(400, "BAD_DAY", "날짜 형식이 맞지 않아요")
        if (s.band != null && Band.entries.none { it.name == s.band }) throw ApiError(400, "BAD_BAND", "알 수 없는 구간이에요")
        val wearer = db.tx { person(userId) }
        val detections = s.signals.mapNotNull { u ->
            Signal.entries.firstOrNull { it.name == u.signal }?.let { Detection(it, u.usual, u.current, u.days) }
        }.filter { it.signal.grade != Grade.INFO || it.signal in GUARDIAN_INFO }
            .filter { it.signal.grade != Grade.EMERGENCY }
        val alerts = detections.map { d -> AlertText.forGuardian(d, wearer.name).let { AlertView(d.signal.name, it.title, it.body) } }
        val alertsJson = Json.encodeToString(ListSerializer(AlertView.serializer()), alerts)
        db.tx {
            val updated = exec(
                "update summaries set score = ?, band = ?, mission_title = ?, mission_done = ?, alerts = ?, updated_at = ? where wearer_id = ? and day = ?",
                s.score, s.band, s.missionTitle.take(80), s.missionDone, alertsJson, now(), userId, day.toString(),
            )
            if (updated == 0) {
                exec(
                    "insert into summaries (wearer_id, day, score, band, mission_title, mission_done, alerts, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
                    userId, day.toString(), s.score, s.band, s.missionTitle.take(80), s.missionDone, alertsJson, now(),
                )
            }
        }
        alerts.filter { it.signal == Signal.ACTIVITY_DROP.name }.forEach { a ->
            sendOnce(userId, day.toString(), a.signal) {
                PushMessage(PushMessage.GUARDIAN_ALERT, a.title, a.body, mapOf("wearerId" to userId, "signal" to a.signal))
            }
        }
    }

    /** 저녁 8시 보호자 하루 요약. 오늘 요약을 올린 착용자만, 보호자마다 하루 한 번. */
    fun digest() {
        val nowLocal = clock.instant().atZone(zone)
        if (nowLocal.toLocalTime() < DIGEST_AT) return
        val day = nowLocal.toLocalDate().toString()
        val wearers = db.tx { query("select distinct wearer_id from summaries where day = ?", day) { it.getString("wearer_id") } }
        wearers.forEach { w ->
            val s = db.tx { summary(w, day) } ?: return@forEach
            val name = db.tx { person(w) }.name
            sendOnce(w, day, DIGEST) { digestMessage(name, s, w) }
        }
    }

    /**
     * 보관 기간 (개인정보 처리방침 6번과 같아야 합니다): 하루 요약 90일, 발송 기록 30일,
     * 만료된 초대 코드 30일, 끝난 긴급 기록 180일. 계정과 연결은 탈퇴할 때 바로, 1년 동안 쓰지 않으면 자동으로 지웁니다.
     */
    @Volatile private var lastCleanup = Long.MIN_VALUE / 2

    fun cleanup() {
        // tick은 1분마다 오지만 보관 기간은 날 단위라 한 시간에 한 번만 지웁니다.
        val nowMs = clock.millis()
        if (nowMs - lastCleanup < Duration.ofHours(1).toMillis()) return
        lastCleanup = nowMs
        val today = today()
        val now = now()
        db.tx {
            exec("delete from summaries where day < ?", today.minusDays(SUMMARY_DAYS).toString())
            exec("delete from sent where day < ?", today.minusDays(SENT_DAYS).toString())
            exec("delete from invites where expires_at < ?", now - Duration.ofDays(INVITE_KEEP_DAYS).toMillis())
            exec(
                "delete from emergencies where status <> ? and closed_at < ?",
                EmergencyService.ACTIVE, now - Duration.ofDays(EMERGENCY_DAYS).toMillis(),
            )
            exec("delete from users where coalesce(last_seen, created_at) < ?", now - Duration.ofDays(INACTIVE_DAYS).toMillis())
        }
    }

    // --- 내부 ---

    private fun digestMessage(name: String, s: DaySummary, wearerId: String): PushMessage {
        val score = s.score?.let { sc -> "컨디션 ${sc}점" + (s.band?.let { " (${Band.valueOf(it).label})" } ?: "") } ?: "오늘은 워치 기록이 없어요"
        val mission = if (s.missionDone) "미션 완료" else "미션 아직"
        val alerts = s.alerts.joinToString(", ") { it.title.removePrefix("$name ") }
        val body = listOfNotNull("$score · $mission", alerts.takeIf { it.isNotEmpty() }?.let { "확인 필요: $it" }).joinToString("\n")
        return PushMessage(PushMessage.DIGEST, "$name 오늘 하루", body, mapOf("wearerId" to wearerId))
    }

    /** 착용자의 보호자들에게 같은 날 같은 종류를 한 번만 보냅니다. */
    private fun sendOnce(wearerId: String, day: String, kind: String, message: () -> PushMessage) {
        val targets = db.tx {
            query(
                """select l.guardian_id, u.push_token from links l join users u on u.id = l.guardian_id
                   where l.wearer_id = ? and not exists (select 1 from sent s where s.wearer_id = l.wearer_id and s.guardian_id = l.guardian_id and s.day = ? and s.kind = ?)""",
                wearerId, day, kind,
            ) { it.getString("guardian_id") to it.getString("push_token") }
        }
        targets.forEach { (guardian, token) ->
            // 동시에 도는 tick(서버 안 15초 + Cloud Scheduler)이 같은 대상을 골라도 기록을 먼저 남긴 쪽만 보냅니다.
            val claimed = db.tx { exec("insert into sent (wearer_id, guardian_id, day, kind) values (?, ?, ?, ?) on conflict do nothing", wearerId, guardian, day, kind) } == 1
            if (claimed) token?.let { push.send(it, message()) }
        }
    }

    private fun Connection.summary(wearerId: String, day: String): DaySummary? =
        query("select * from summaries where wearer_id = ? and day = ?", wearerId, day) {
            DaySummary(
                day = it.getString("day"),
                score = it.intOrNull("score"),
                band = it.getString("band"),
                missionTitle = it.getString("mission_title"),
                missionDone = it.getBoolean("mission_done"),
                alerts = Json.decodeFromString(ListSerializer(AlertView.serializer()), it.getString("alerts")),
            )
        }.firstOrNull()

    private fun Connection.renumber(wearerId: String) {
        query("select guardian_id from links where wearer_id = ? order by priority", wearerId) { it.getString("guardian_id") }
            .forEachIndexed { i, g -> exec("update links set priority = ? where wearer_id = ? and guardian_id = ?", i + 1, wearerId, g) }
    }

    private fun normalize(code: String) = code.uppercase().filter { it.isLetterOrDigit() }

    private fun now() = clock.millis()
    private fun today() = clock.instant().atZone(zone).toLocalDate()

    companion object {
        const val DIGEST = "DIGEST"
        const val MAX_GUARDIANS = 5
        private const val CODE_LENGTH = 8
        /** 헷갈리는 글자(0·O, 1·I) 없이. */
        private const val CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        private val INVITE_DAYS = Duration.ofDays(7)
        private val DIGEST_AT = LocalTime.of(20, 0)
        const val SUMMARY_DAYS = 90L
        const val SENT_DAYS = 30L
        const val INVITE_KEEP_DAYS = 30L
        const val EMERGENCY_DAYS = 180L
        const val INACTIVE_DAYS = 365L

        /** 정보 등급 중 보호자에게도 보여줄 것. */
        private val GUARDIAN_INFO = setOf(Signal.WATCH_NOT_WORN, Signal.MEDICATION_MISSED)

        fun hash(token: String): String =
            MessageDigest.getInstance("SHA-256").digest(token.toByteArray()).joinToString("") { "%02x".format(it) }

        fun cleanName(name: String): String =
            name.trim().take(20).ifEmpty { throw ApiError(400, "BAD_NAME", "이름을 적어 주세요") }

        fun cleanPhone(phone: String): String? {
            val p = phone.filter { it.isDigit() || it == '+' }
            if (p.isEmpty()) return null
            if (p.length !in 8..16) throw ApiError(400, "BAD_PHONE", "전화번호를 확인해 주세요")
            return p
        }
    }
}

fun Connection.person(userId: String): Person =
    query("select id, name, phone from users where id = ?", userId) { Person(it.getString("id"), it.getString("name"), it.getString("phone")) }
        .firstOrNull() ?: throw ApiError(404, "NO_USER", "계정을 찾을 수 없어요")

fun Connection.pushToken(userId: String): String? =
    query("select push_token from users where id = ?", userId) { it.getString("push_token") }.firstOrNull()
