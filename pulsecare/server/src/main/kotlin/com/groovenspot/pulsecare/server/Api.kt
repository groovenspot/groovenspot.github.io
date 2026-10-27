package com.groovenspot.pulsecare.server

import kotlinx.serialization.Serializable

/** 앱과 주고받는 JSON. */
@Serializable data class SignUpRequest(val name: String)

@Serializable data class SignUpResponse(val userId: String, val token: String)

@Serializable data class Me(val userId: String, val name: String, val phone: String? = null)

@Serializable data class UpdateMe(val name: String? = null, val phone: String? = null, val pushToken: String? = null)

/** [role]은 초대한 사람이 맡을 역할: GUARDIAN이면 받은 사람이 착용자(부모님)가 됩니다. */
@Serializable data class InviteRequest(val role: Role)

@Serializable data class InviteResponse(val code: String, val expiresAt: Long)

@Serializable data class AcceptRequest(val code: String)

/** 수락 전에 보여줄 것: 누가, 어떤 역할로 초대했는지 (받는 사람이 무엇에 동의하는지 알 수 있게). */
@Serializable data class InvitePreview(val inviterName: String, val inviterRole: Role)

@Serializable enum class Role { GUARDIAN, WEARER }

@Serializable data class Person(val userId: String, val name: String, val phone: String? = null)

@Serializable data class GuardianView(val person: Person, val priority: Int)

@Serializable data class AlertView(val signal: String, val title: String, val body: String)

@Serializable data class DaySummary(
    val day: String,
    val score: Int? = null,
    val band: String? = null,
    val missionTitle: String,
    val missionDone: Boolean,
    val alerts: List<AlertView> = emptyList(),
)

@Serializable data class EmergencyView(
    val id: String,
    val wearerId: String,
    val signal: String,
    val createdAt: Long,
    val status: String,
    val title: String,
    val body: String,
    val closedBy: String? = null,
)

@Serializable data class WearerView(val person: Person, val today: DaySummary? = null, val emergencies: List<EmergencyView> = emptyList())

@Serializable data class Family(val guardians: List<GuardianView>, val wearers: List<WearerView>)

@Serializable data class OrderRequest(val guardianIds: List<String>)

/** 폰이 올리는 감지 신호. 문구는 서버가 보호자용으로 만듭니다. */
@Serializable data class SignalUpload(val signal: String, val usual: Double? = null, val current: Double? = null, val days: Int? = null)

@Serializable data class SummaryUpload(
    val day: String,
    val score: Int? = null,
    val band: String? = null,
    val missionTitle: String,
    val missionDone: Boolean,
    val signals: List<SignalUpload> = emptyList(),
)

@Serializable data class EmergencyRequest(val signal: String)

@Serializable data class EmergencyCreated(val id: String, val guardians: Int)

@Serializable data class ErrorBody(val error: String, val message: String)

/** 앱에 그대로 보여줄 수 있는 오류. [code]는 앱이 분기할 때 씁니다. */
class ApiError(val status: Int, val code: String, override val message: String) : RuntimeException(message)
