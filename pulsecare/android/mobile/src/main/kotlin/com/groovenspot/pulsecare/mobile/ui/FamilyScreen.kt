package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.alert.FeedbackResponse
import com.groovenspot.pulsecare.mobile.family.EmergencyView
import com.groovenspot.pulsecare.mobile.family.Family
import com.groovenspot.pulsecare.mobile.family.GuardianView
import com.groovenspot.pulsecare.mobile.family.Invite
import com.groovenspot.pulsecare.mobile.family.Person
import com.groovenspot.pulsecare.mobile.family.WearerView
import com.groovenspot.pulsecare.score.Band
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** 가족 탭 한 장. 상태만 받아 그립니다. */
data class FamilyUi(
    /** 서버 주소가 들어간 빌드인지. */
    val configured: Boolean,
    /** 푸시(FCM) 설정이 들어간 빌드인지. 없으면 탭을 열 때만 새 소식을 봅니다. */
    val pushConfigured: Boolean,
    /** 가족 계정. null이면 시작 화면. */
    val me: Person?,
    val family: Family? = null,
    /** 방금 만든 초대 (역할, 코드). */
    val invite: Pair<String, Invite>? = null,
    /** 코드 확인 결과: (코드, 초대한 사람, 그 사람 역할). 동의를 받은 뒤 수락합니다. */
    val pendingAccept: Triple<String, String, String>? = null,
    val busy: Boolean = false,
    val error: String? = null,
    /** 방금 만든 새 폰 옮기기 코드. */
    val transfer: Invite? = null,
    val now: Instant = Instant.now(),
)

/** 공유 동의 문구 (착용자가 동의하는 것). 기획서 17번: 원수치는 공유하지 않습니다. */
const val SHARING_CONSENT =
    "보호자에게 매일 컨디션 점수와 구간, 오늘의 미션 완료 여부, 주의 알림(걸음 수 감소 등)과 긴급 알림(SOS·낙상)이 공유돼요. " +
        "수면 시간·심박 같은 수치는 공유하지 않아요. 언제든 연결을 끊을 수 있어요."

@Composable
fun FamilyContent(
    ui: FamilyUi,
    onStart: (name: String, phone: String) -> Unit,
    onInvite: (role: String) -> Unit,
    onShareInvite: (Invite, role: String) -> Unit,
    onCheckCode: (String) -> Unit,
    onAccept: (String) -> Unit,
    onDismissAccept: () -> Unit,
    onUnlink: (Person) -> Unit,
    onMove: (GuardianView, up: Boolean) -> Unit,
    onAck: (EmergencyView) -> Unit,
    onCall: (String) -> Unit,
    onReload: () -> Unit,
    onOpenSettings: () -> Unit = {},
    /** 보호자가 주의 알림에 답함 (신호 이름, 응답). */
    onAlertFeedback: (String, FeedbackResponse) -> Unit = { _, _ -> },
    /** 워치 없는 보호자: "나를 챙기는 보호자"와 "보호자 초대"를 숨깁니다. */
    guardianMode: Boolean = false,
    /** 새 폰에서 기존 계정 불러오기 (코드). */
    onRestore: (String) -> Unit = {},
    /** 옛 폰에서 옮기기 코드 만들기. */
    onTransfer: () -> Unit = {},
    onDismissTransfer: () -> Unit = {},
) {
    var consentInvite by remember { mutableStateOf(false) }
    var confirmUnlink by remember { mutableStateOf<Person?>(null) }

    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier
            .fillMaxSize()
            .background(Palette.Paper)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("가족", color = Palette.Navy, fontSize = 28.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            if (ui.me != null) TextButton(onClick = onReload) { Text("새로고침", color = Palette.Teal) }
            TextButton(onClick = onOpenSettings) { Text("내 정보", color = Palette.Teal, fontWeight = FontWeight.SemiBold) }
        }
        ui.error?.let { Text(it, color = Palette.Coral, fontSize = 14.sp) }

        when {
            !ui.configured -> FamilyPanel {
                Text("가족 연결 준비 중", color = Palette.Navy, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Text(
                    "이 테스트 빌드에는 가족 서버 주소가 없어요. 서버를 연결한 빌드에서 보호자 초대, 하루 요약 공유, 긴급 알림 전달을 쓸 수 있어요.",
                    color = Palette.Body,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                )
            }
            ui.me == null -> {
                StartPanel(ui.busy, onStart)
                RestorePanel(ui.busy, onRestore)
            }
            else -> {
                val family = ui.family
                family?.wearers?.flatMap { w -> w.emergencies.map { w to it } }?.forEach { (w, e) -> EmergencyCard(w, e, ui, onAck, onCall) }
                if (family == null) {
                    Text("가족을 불러오는 중이에요", color = Palette.Muted)
                } else {
                    if (family.wearers.isNotEmpty()) {
                        SectionTitle("내가 챙기는 가족")
                        family.wearers.forEach { WearerCard(it, onCall, onAlertFeedback) }
                    }
                    if (!guardianMode || family.guardians.isNotEmpty()) {
                        SectionTitle("나를 챙기는 보호자")
                        GuardiansPanel(family.guardians, onMove, onUnlink = { confirmUnlink = it })
                    }
                }
                InvitePanel(ui, onInvite = { role -> if (role == "WEARER") consentInvite = true else onInvite(role) }, onShareInvite, onCheckCode, guardianMode)
                if (family != null && family.wearers.isNotEmpty()) {
                    family.wearers.forEach { w ->
                        TextButton(onClick = { confirmUnlink = w.person }) { Text("${w.person.name}님과 연결 끊기", color = Palette.Muted, fontSize = 13.sp) }
                    }
                }
                if (!ui.pushConfigured) {
                    Text(
                        "이 테스트 빌드는 푸시 설정이 없어 가족 소식을 이 탭을 열 때만 확인해요. 긴급 알림을 받으려면 푸시가 설정된 빌드가 필요해요.",
                        color = Palette.Amber,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                    )
                }
                Text("내 이름: ${ui.me.name}" + (ui.me.phone?.let { " · $it" } ?: ""), color = Palette.Muted, fontSize = 13.sp)
                TextButton(onClick = onTransfer, enabled = !ui.busy) { Text("새 폰으로 옮기기", color = Palette.Teal, fontSize = 13.sp) }
            }
        }
        Spacer(Modifier.height(8.dp))
    }

    if (consentInvite) {
        AlertDialog(
            onDismissRequest = { consentInvite = false },
            title = { Text("보호자를 초대할까요?") },
            text = { Text(SHARING_CONSENT, lineHeight = 21.sp) },
            confirmButton = {
                TextButton(onClick = {
                    consentInvite = false
                    onInvite("WEARER")
                }) { Text("동의하고 초대") }
            },
            dismissButton = { TextButton(onClick = { consentInvite = false }) { Text("취소") } },
        )
    }
    ui.pendingAccept?.let { (code, inviter, role) ->
        // 초대한 사람이 보호자면 내가 착용자: 무엇이 공유되는지 보여주고 동의를 받습니다.
        val wearer = role == "GUARDIAN"
        AlertDialog(
            onDismissRequest = onDismissAccept,
            title = { Text(if (wearer) "${inviter}님이 보호자가 돼요" else "${inviter}님의 보호자가 돼요") },
            text = {
                Text(
                    if (wearer) SHARING_CONSENT
                    else "${inviter}님의 하루 요약(컨디션 점수, 미션, 주의 알림)과 긴급 알림(SOS·낙상)을 받아요. 긴급 알림을 받으면 꼭 확인해 주세요.",
                    lineHeight = 21.sp,
                )
            },
            confirmButton = { TextButton(onClick = { onAccept(code) }) { Text(if (wearer) "동의하고 연결" else "연결하기") } },
            dismissButton = { TextButton(onClick = onDismissAccept) { Text("취소") } },
        )
    }
    ui.transfer?.let { t ->
        AlertDialog(
            onDismissRequest = onDismissTransfer,
            title = { Text("새 폰에 이 코드를 입력하세요") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(t.code.chunked(5).joinToString(" "), color = Palette.Navy, fontSize = 28.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    Text(
                        "새 폰의 펄스케어 > 가족 탭 > \"폰을 바꿨어요\"에 입력하면 이름, 가족 연결, 연락 순서가 그대로 옮겨져요. " +
                            "10분 동안 한 번만 쓸 수 있고, 옮기면 이 폰은 가족 계정에서 로그아웃돼요. 다른 사람에게 보여 주지 마세요.",
                        lineHeight = 21.sp,
                    )
                }
            },
            confirmButton = { TextButton(onClick = onDismissTransfer) { Text("닫기") } },
        )
    }
    confirmUnlink?.let { p ->
        AlertDialog(
            onDismissRequest = { confirmUnlink = null },
            title = { Text("${p.name}님과 연결을 끊을까요?") },
            text = { Text("더 이상 하루 요약과 긴급 알림을 주고받지 않아요. 다시 연결하려면 새 초대 코드가 필요해요.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmUnlink = null
                    onUnlink(p)
                }) { Text("연결 끊기", color = Palette.Coral) }
            },
            dismissButton = { TextButton(onClick = { confirmUnlink = null }) { Text("취소") } },
        )
    }
}

@Composable
internal fun FamilyPanel(border: Color = Palette.Line, content: @Composable () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Palette.Card),
        border = BorderStroke(2.dp, if (border == Palette.Line) Palette.Card else border),
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(18.dp)) { content() }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.Bold)
}

@Composable
private fun StartPanel(busy: Boolean, onStart: (String, String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    FamilyPanel {
        Text("가족과 함께 챙기기", color = Palette.Navy, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Text(
            "부모님이나 가족을 초대하면 하루 요약을 함께 보고, SOS를 누르면 보호자에게 바로 알려요.",
            color = Palette.Body,
            fontSize = 14.sp,
            lineHeight = 20.sp,
        )
        OutlinedTextField(
            value = name,
            onValueChange = { name = it.take(20) },
            label = { Text("가족에게 보일 이름 (예: 엄마, 민지)") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it.take(16) },
            label = { Text("전화번호 (선택, 가족이 '전화하기'에 써요)") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            onClick = { onStart(name.trim(), phone.trim()) },
            enabled = name.isNotBlank() && !busy,
            colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) { Text(if (busy) "만드는 중…" else "시작하기") }
    }
}

/** 폰을 바꾼 사람: 옛 폰에서 만든 코드로 기존 계정을 불러옵니다. */
@Composable
private fun RestorePanel(busy: Boolean, onRestore: (String) -> Unit) {
    var code by remember { mutableStateOf("") }
    FamilyPanel {
        Text("폰을 바꿨어요", color = Palette.Navy, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text("옛 폰의 가족 탭 > \"새 폰으로 옮기기\"에서 받은 10자리 코드를 넣으면 가족 연결을 그대로 가져와요.", color = Palette.Muted, fontSize = 13.sp, lineHeight = 18.sp)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = code,
                onValueChange = { code = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(10) },
                label = { Text("옮기기 코드 10자리") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                modifier = Modifier.weight(1f),
            )
            Button(
                onClick = { onRestore(code) },
                enabled = code.length == 10 && !busy,
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                shape = RoundedCornerShape(14.dp),
            ) { Text("불러오기") }
        }
    }
}

private val CLOCK = DateTimeFormatter.ofPattern("HH:mm")

private fun ago(at: Long, now: Instant): String {
    val m = Duration.between(Instant.ofEpochMilli(at), now).toMinutes()
    return when {
        m < 1 -> "방금"
        m < 60 -> "${m}분 전"
        else -> Instant.ofEpochMilli(at).atZone(ZoneId.systemDefault()).format(CLOCK)
    }
}

@Composable
internal fun EmergencyCard(w: WearerView, e: EmergencyView, ui: FamilyUi, onAck: (EmergencyView) -> Unit, onCall: (String) -> Unit) {
    FamilyPanel(border = if (e.active) Palette.Coral else Palette.Line) {
        Text(ago(e.createdAt, ui.now), color = Palette.Muted, fontSize = 13.sp)
        Text(e.title, color = if (e.active) Palette.Coral else Palette.Navy, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Text(e.body, color = Palette.Body, fontSize = 15.sp, lineHeight = 21.sp)
        if (e.active) {
            Button(
                onClick = { onAck(e) },
                enabled = !ui.busy,
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Coral),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("확인했어요 (다른 보호자 연락 멈춤)") }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                w.person.phone?.let { phone ->
                    OutlinedButton(onClick = { onCall(phone) }, modifier = Modifier.weight(1f)) { Text("전화하기", color = Palette.Navy) }
                }
                OutlinedButton(onClick = { onCall("119") }, modifier = Modifier.weight(1f)) { Text("119 연결", color = Palette.Coral) }
            }
        } else {
            val closed = when {
                e.status == "CANCELLED" -> "${w.person.name}님이 괜찮다고 했어요"
                e.closedBy == ui.me?.userId -> "내가 확인했어요"
                e.status == "ACKED" -> "다른 보호자가 확인했어요"
                else -> "끝난 알림이에요"
            }
            Text(closed, color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
internal fun WearerCard(w: WearerView, onCall: (String) -> Unit, onAlertFeedback: (String, FeedbackResponse) -> Unit) {
    FamilyPanel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(w.person.name, color = Palette.Navy, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            w.person.phone?.let { phone -> TextButton(onClick = { onCall(phone) }) { Text("전화하기", color = Palette.Teal) } }
        }
        val t = w.today
        if (t == null) {
            Text("오늘 요약이 아직 없어요. 아침 리포트 뒤에 올라와요.", color = Palette.Muted, fontSize = 14.sp)
        } else {
            val band = t.band?.let { runCatching { Band.valueOf(it) }.getOrNull() }
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(t.score?.toString() ?: "-", color = Palette.Navy, fontSize = 36.sp, fontWeight = FontWeight.Bold)
                Text(
                    band?.label ?: "워치 기록 없음",
                    color = band?.color ?: Palette.Muted,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(bottom = 6.dp),
                )
            }
            Text(
                (if (t.missionDone) "미션 완료 · " else "미션 아직 · ") + t.missionTitle,
                color = if (t.missionDone) Palette.Teal else Palette.Body,
                fontSize = 14.sp,
            )
            t.alerts.forEach { a ->
                // 오늘 이 화면에서 답했는지만 기억합니다 (응답은 이용 통계로만 셉니다).
                var answered by remember(t.day, a.signal) { mutableStateOf<FeedbackResponse?>(null) }
                Column(Modifier.padding(top = 4.dp)) {
                    Text(a.title, color = Palette.Amber, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(a.body, color = Palette.Body, fontSize = 13.sp, lineHeight = 18.sp)
                    val r = answered
                    if (r == null) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            listOf(FeedbackResponse.CONTACTED, FeedbackResponse.FALSE_ALARM).forEach { response ->
                                TextButton(onClick = {
                                    answered = response
                                    onAlertFeedback(a.signal, response)
                                }) { Text(response.label, color = if (response == FeedbackResponse.CONTACTED) Palette.Teal else Palette.Muted, fontSize = 13.sp) }
                            }
                        }
                    } else {
                        Text(if (r == FeedbackResponse.CONTACTED) "연락했다고 남겼어요" else "알려 주셔서 고마워요", color = Palette.Teal, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun GuardiansPanel(guardians: List<GuardianView>, onMove: (GuardianView, Boolean) -> Unit, onUnlink: (Person) -> Unit) {
    FamilyPanel {
        if (guardians.isEmpty()) {
            Text("아직 보호자가 없어요. 아래에서 보호자를 초대하면 SOS가 보호자에게 가요.", color = Palette.Body, fontSize = 14.sp, lineHeight = 20.sp)
        } else {
            Text("긴급할 때 이 순서로 1분 간격으로 알려요. 3분 안에 아무도 확인하지 않으면 모두에게 다시 알려요.", color = Palette.Muted, fontSize = 13.sp, lineHeight = 18.sp)
            guardians.forEachIndexed { i, g ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${g.priority}", color = Palette.Teal, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(24.dp))
                    Text(g.person.name, color = Palette.Navy, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    if (i > 0) TextButton(onClick = { onMove(g, true) }) { Text("위로", color = Palette.Teal, fontSize = 13.sp) }
                    if (i < guardians.size - 1) TextButton(onClick = { onMove(g, false) }) { Text("아래로", color = Palette.Teal, fontSize = 13.sp) }
                    TextButton(onClick = { onUnlink(g.person) }) { Text("끊기", color = Palette.Muted, fontSize = 13.sp) }
                }
            }
        }
    }
}

@Composable
private fun InvitePanel(
    ui: FamilyUi,
    onInvite: (String) -> Unit,
    onShareInvite: (Invite, String) -> Unit,
    onCheckCode: (String) -> Unit,
    guardianMode: Boolean = false,
) {
    var code by remember { mutableStateOf("") }
    FamilyPanel {
        Text("초대하기", color = Palette.Navy, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        ui.invite?.let { (role, invite) ->
            Text(if (role == "WEARER") "보호자에게 보낼 코드" else "챙길 가족에게 보낼 코드", color = Palette.Muted, fontSize = 13.sp)
            Text(invite.code.chunked(4).joinToString(" "), color = Palette.Navy, fontSize = 30.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
            Text("7일 동안 한 번 쓸 수 있어요. 받은 사람이 펄스케어 가족 탭에서 입력해요.", color = Palette.Muted, fontSize = 13.sp)
            Button(
                onClick = { onShareInvite(invite, role) },
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("메시지로 보내기") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (!guardianMode) {
                OutlinedButton(onClick = { onInvite("WEARER") }, enabled = !ui.busy, modifier = Modifier.weight(1f)) { Text("보호자 초대", color = Palette.Navy) }
            }
            OutlinedButton(onClick = { onInvite("GUARDIAN") }, enabled = !ui.busy, modifier = Modifier.weight(1f)) { Text("부모님 초대", color = Palette.Navy) }
        }
        Text("받은 코드가 있나요?", color = Palette.Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = code,
                onValueChange = { code = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(8) },
                label = { Text("초대 코드 8자리") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                modifier = Modifier.weight(1f),
            )
            Button(
                onClick = { onCheckCode(code) },
                enabled = code.length == 8 && !ui.busy,
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                shape = RoundedCornerShape(14.dp),
            ) { Text("확인") }
        }
    }
}
