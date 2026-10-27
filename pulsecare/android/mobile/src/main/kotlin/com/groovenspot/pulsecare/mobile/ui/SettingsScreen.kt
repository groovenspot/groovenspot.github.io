package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TimePickerDefaults
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mobile.data.Legal
import com.groovenspot.pulsecare.mobile.data.NotificationSettings
import com.groovenspot.pulsecare.mobile.data.Profile
import java.time.LocalTime

/** 설정 화면에 쓰는 신호 이름과 조건 (기획서 12번 "신호별 판단 기준"). */
internal val SIGNAL_LABELS = mapOf(
    Signal.RESTING_HR_RISE to ("안정시 심박 상승" to "3일 연속 평소보다 10 bpm 이상 높을 때"),
    Signal.ACTIVITY_DROP to ("걸음 수 급감" to "3일 연속 평소의 40% 이하일 때"),
    Signal.LOW_SPO2 to ("수면 중 산소포화도" to "7일 중 3일, 90% 미만 구간이 반복될 때"),
    Signal.SLEEP_DEBT to ("수면 부족 누적" to "5일 중 4일, 필요량보다 1시간 이상 짧을 때"),
    Signal.STRESS to ("스트레스 지속" to "3일 연속 HRV가 평소보다 20% 이상 낮을 때"),
)

private enum class TimeField { MORNING, EVENING, QUIET_START, QUIET_END }

/** 내 정보 (기획서 16번 "내 정보") + 알림 설정. 상태만 받아 그립니다. */
@Composable
fun SettingsContent(
    profile: Profile,
    settings: NotificationSettings,
    onSettings: (NotificationSettings) -> Unit,
    onSeniorMode: (Boolean) -> Unit,
    onChangeGoal: () -> Unit,
    onPermissions: () -> Unit,
    onClearData: () -> Unit,
    onBack: () -> Unit,
    /** 디버그 빌드에서만 넘깁니다. */
    onOpenTestTools: (() -> Unit)? = null,
    /** 약관·처리방침을 브라우저로. */
    onOpenUrl: (String) -> Unit = {},
    /** 동의한 날짜 (예: "2027-06-16"). */
    consentDate: String? = null,
    /** 이용 통계 (선택 동의). */
    analytics: Boolean = false,
    onAnalytics: (Boolean) -> Unit = {},
) {
    var editing by remember { mutableStateOf<TimeField?>(null) }
    var confirmClear by remember { mutableStateOf(false) }

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
            Text("내 정보", color = Palette.Navy, fontSize = 26.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            TextButton(onClick = onBack) { Text("닫기", color = Palette.Teal) }
        }

        Section("나") {
            LinkRow("목표", profile.goal.label + " · 레벨 ${profile.level}", onChangeGoal)
            Divider()
            SwitchRow("쉽게 보기", "큰 글씨, 버튼은 꼭 필요한 것만. 미션은 걷기·수면 위주로", profile.seniorMode, onSeniorMode)
            Divider()
            LinkRow("건강 데이터 권한", "Health Connect에서 읽을 항목 고르기", onPermissions)
        }

        Section("알림") {
            SwitchRow("아침 리포트", "컨디션 점수와 오늘의 미션", settings.morningEnabled) { onSettings(settings.copy(morningEnabled = it)) }
            if (settings.morningEnabled) TimeRow("받는 시각", settings.morningTime) { editing = TimeField.MORNING }
            Divider()
            SwitchRow("저녁 요약", "못 한 미션과 하루 정보", settings.eveningEnabled) { onSettings(settings.copy(eveningEnabled = it)) }
            if (settings.eveningEnabled) TimeRow("받는 시각", settings.eveningTime) { editing = TimeField.EVENING }
            Divider()
            SwitchRow("주간 리포트", "일요일 저녁, 한 주 미션과 변화", settings.weeklyEnabled) { onSettings(settings.copy(weeklyEnabled = it)) }
            Divider()
            Text("방해 금지", color = Palette.Navy, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Text("이 시간에는 주의·정보 알림을 모아 두었다가 아침에 보내요", color = Palette.Muted, fontSize = 13.sp)
            TimeRow("시작", settings.quietStart) { editing = TimeField.QUIET_START }
            TimeRow("끝", settings.quietEnd) { editing = TimeField.QUIET_END }
        }

        Section("건강 알림") {
            NotificationSettings.ADJUSTABLE.forEachIndexed { i, signal ->
                if (i > 0) Divider()
                val (title, rule) = SIGNAL_LABELS.getValue(signal)
                SwitchRow(title, rule, settings.allows(signal)) { on ->
                    onSettings(settings.copy(disabledSignals = if (on) settings.disabledSignals - signal else settings.disabledSignals + signal))
                }
            }
            Divider()
            Text(
                "넘어짐·SOS 긴급 알림은 끌 수 없어요. 워치 앱과 함께 제공돼요.",
                color = Palette.Muted,
                fontSize = 13.sp,
                lineHeight = 18.sp,
            )
        }

        onOpenTestTools?.let { open ->
            Section("테스트 도구 (테스트 빌드)") {
                LinkRow("데이터·알림 점검", "Health Connect 기록 확인, 알림 지금 보내기", open)
            }
        }

        Section("데이터") {
            Text(
                "건강 수치는 이 휴대폰에서만 계산하고 저장하지 않아요. 저장하는 건 점수 숫자, 미션 기록, 설정뿐이에요. " +
                    "가족 연결을 쓰면 이름과 하루 요약(점수·미션·주의 알림)이 서버에 있어요.",
                color = Palette.Body,
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )
            TextButton(onClick = { confirmClear = true }) { Text("기록 지우기 · 동의 철회 · 탈퇴", color = Palette.Coral) }
        }

        Section("약관 · 개인정보") {
            SwitchRow("이용 통계 보내기 (선택)", "어떤 기능을 썼는지만, 점수·수치·이름 없이. 끄면 모은 통계도 지워요", analytics, onAnalytics)
            Divider()
            LinkRow("서비스 이용약관", "펄스케어는 진단·치료가 아닌 웰니스 서비스예요", { onOpenUrl(Legal.TERMS_URL) })
            Divider()
            LinkRow("개인정보 처리방침", consentDate?.let { "$it 동의 · 수집 항목, 보관 기간, 삭제 방법" } ?: "수집 항목, 보관 기간, 삭제 방법", { onOpenUrl(Legal.PRIVACY_URL) })
        }
        Spacer(Modifier.height(8.dp))
    }

    editing?.let { field ->
        val initial = when (field) {
            TimeField.MORNING -> settings.morningTime
            TimeField.EVENING -> settings.eveningTime
            TimeField.QUIET_START -> settings.quietStart
            TimeField.QUIET_END -> settings.quietEnd
        }
        TimeDialog(initial, onDismiss = { editing = null }) { t ->
            onSettings(
                when (field) {
                    TimeField.MORNING -> settings.copy(morningTime = t)
                    TimeField.EVENING -> settings.copy(eveningTime = t)
                    TimeField.QUIET_START -> settings.copy(quietStart = t)
                    TimeField.QUIET_END -> settings.copy(quietEnd = t)
                },
            )
            editing = null
        }
    }

    if (confirmClear) {
        AlertDialog(
            onDismissRequest = { confirmClear = false },
            title = { Text("기록을 지우고 탈퇴할까요?") },
            text = {
                Text(
                    "목표, 레벨, 미션 기록, 점수 기록, 설정, 동의 기록이 지워지고 처음 화면으로 돌아가요. " +
                        "가족 계정이 있으면 서버의 계정, 가족 연결, 하루 요약, 긴급 기록도 바로 지워요. " +
                        "Health Connect의 건강 데이터는 그대로예요. 앱을 다시 쓰려면 처음부터 동의해야 해요.",
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmClear = false
                    onClearData()
                }) { Text("지우기", color = Palette.Coral) }
            },
            dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("취소") } },
        )
    }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 4.dp))
        Card(
            colors = CardDefaults.cardColors(containerColor = Palette.Card),
            border = BorderStroke(1.dp, Palette.Line),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(16.dp)) { content() }
        }
    }
}

@Composable
private fun Divider() = HorizontalDivider(color = Palette.Line)

@Composable
private fun SwitchRow(title: String, detail: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, color = Palette.Navy, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Text(detail, color = Palette.Muted, fontSize = 13.sp, lineHeight = 18.sp)
        }
        Switch(
            checked = checked,
            onCheckedChange = onChange,
            colors = SwitchDefaults.colors(checkedTrackColor = Palette.Teal),
        )
    }
}

@Composable
private fun LinkRow(title: String, detail: String, onClick: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, color = Palette.Navy, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Text(detail, color = Palette.Muted, fontSize = 13.sp)
        }
        Text("›", color = Palette.Muted, fontSize = 22.sp)
    }
}

@Composable
private fun TimeRow(label: String, time: LocalTime, onClick: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Text(label, color = Palette.Body, fontSize = 15.sp, modifier = Modifier.weight(1f))
        Text(timeLabel(time), color = Palette.Teal, fontSize = 16.sp, fontWeight = FontWeight.Bold)
    }
}

/** 07:30 → "오전 7:30", 21:00 → "오후 9:00". */
internal fun timeLabel(t: LocalTime): String {
    val half = if (t.hour < 12) "오전" else "오후"
    val h = (t.hour % 12).let { if (it == 0) 12 else it }
    return "$half $h:${t.minute.toString().padStart(2, '0')}"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimeDialog(initial: LocalTime, onDismiss: () -> Unit, onConfirm: (LocalTime) -> Unit) {
    val state = rememberTimePickerState(initialHour = initial.hour, initialMinute = initial.minute, is24Hour = false)
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = { onConfirm(LocalTime.of(state.hour, state.minute)) }) { Text("확인") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } },
        text = { TimePicker(state = state, colors = TimePickerDefaults.colors(selectorColor = Palette.Teal)) },
    )
}
