package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.alert.AlertMessage
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.FeedbackResponse
import com.groovenspot.pulsecare.alert.Grade
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.mission.Check
import com.groovenspot.pulsecare.mission.Mission
import com.groovenspot.pulsecare.mission.MissionProgress
import com.groovenspot.pulsecare.mission.MissionVerifier
import com.groovenspot.pulsecare.report.WeeklySummary
import com.groovenspot.pulsecare.mission.Verification
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.ScoreResult
import java.time.LocalDate
import java.time.LocalTime
import com.groovenspot.pulsecare.care.Dose
import com.groovenspot.pulsecare.score.DayTag
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/** 홈의 생활 도우미 카드에 쓰는 값. [tags]가 null이면 오늘 아직 안 남김. */
data class HomeCare(val tags: Set<DayTag>?, val water: Int, val doses: List<Dose>, val now: LocalTime)

/** 상태만 받아 그리는 홈. 스크린샷 테스트에서도 그대로 씁니다. */
@Composable
fun HomeContent(
    state: HomeState,
    onCompleteMission: () -> Unit,
    onSwapMission: () -> Unit,
    onFeeling: (Int) -> Unit,
    onOpenPermissions: () -> Unit,
    weekly: WeeklySummary? = null,
    onWeeklyAccept: () -> Unit = {},
    onWeeklyClose: () -> Unit = {},
    onChangeGoal: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    /** 시니어 "쉽게 보기": 버튼은 꼭 필요한 것만 (기획서 14번). 큰 글씨는 바깥에서 글자 배율로. */
    easyMode: Boolean = false,
    /** 오늘 알림에 한 응답 (신호별). */
    alertFeedback: Map<Signal, FeedbackResponse> = emptyMap(),
    /** 같은 신호를 2번 "잘못된 알림"이라고 해서 7일 쉬자고 물을 신호. */
    snoozeSuggestions: Set<Signal> = emptySet(),
    /** 쉬는 중인 신호와 끝나는 날. */
    snoozedUntil: Map<Signal, LocalDate> = emptyMap(),
    onAlertFeedback: (Detection, FeedbackResponse) -> Unit = { _, _ -> },
    onSnooze: (Signal, Boolean) -> Unit = { _, _ -> },
    onUnsnooze: (Signal) -> Unit = {},
    /** AI 건강 상담 열기 (서버가 없는 빌드에서는 null). */
    onOpenChat: (() -> Unit)? = null,
    /** 생활 도우미: 몸 상태 태그, 물, 오늘 약. 보호자 전용이면 null. */
    care: HomeCare? = null,
    onTags: (Set<DayTag>) -> Unit = {},
    onWater: (Int) -> Unit = {},
    onDoseTaken: (Dose) -> Unit = {},
    onManageMedications: () -> Unit = {},
    /** 1분 호흡 가이드 열기. */
    onBreathing: (() -> Unit)? = null,
) {
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
            Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.weight(1f)) {
                Text(dateLabel(state), color = Palette.Muted, fontSize = 14.sp)
                Text("오늘의 컨디션", color = Palette.Navy, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            }
            onOpenChat?.let { TextButton(onClick = it) { Text("AI 상담", color = Palette.Teal, fontWeight = FontWeight.SemiBold) } }
            TextButton(onClick = onOpenSettings) { Text("내 정보", color = Palette.Teal, fontWeight = FontWeight.SemiBold) }
        }
        if (state.missingPermissions) PermissionBanner(onOpenPermissions)
        ScoreCard(state, onFeeling)
        weekly?.let { WeeklyCard(it, onWeeklyAccept, onWeeklyClose, onChangeGoal) }
        MissionCard(
            state.mission, state.missionDone, state.missionCheck, state.canSwap && !easyMode, onCompleteMission, onSwapMission,
            onBreathing = onBreathing?.takeIf { state.mission.id in MissionVerifier.BREATHING_MISSIONS },
        )
        care?.let { c ->
            if (state.mission.id == "C-07" || c.water > 0) WaterCard(c.water, onWater)
            if (c.doses.isNotEmpty()) MedicationCard(c.doses, c.now, onDoseTaken, onManageMedications)
            TagCard(c.tags, onTags)
        }
        state.alerts.forEachIndexed { i, alert ->
            val d = state.alertDetections.getOrNull(i)
            AlertCard(
                alert,
                d,
                response = d?.let { alertFeedback[it.signal] },
                suggestSnooze = d != null && d.signal in snoozeSuggestions,
                snoozedUntil = d?.let { snoozedUntil[it.signal] },
                onFeedback = onAlertFeedback,
                onSnooze = onSnooze,
                onUnsnooze = onUnsnooze,
                onBreathing = onBreathing?.takeIf { d?.signal == Signal.STRESS || d?.signal == Signal.HIGH_HR_AT_REST },
            )
        }
        Spacer(Modifier.height(8.dp))
    }
}

private fun dateLabel(state: HomeState): String {
    val d = state.date
    return d.format(DateTimeFormatter.ofPattern("M월 d일")) + " " + d.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.KOREAN)
}

@Composable
private fun SectionCard(content: @Composable () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Palette.Card),
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.padding(22.dp)) { content() }
    }
}

@Composable
private fun ScoreCard(state: HomeState, onFeeling: (Int) -> Unit) {
    val result = state.score
    SectionCard {
        when (result.kind) {
            ScoreResult.Kind.NO_DATA -> NoDataScore(result, onFeeling)
            else -> {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    ScoreRing(result.score, result.band, caption = if (result.kind == ScoreResult.Kind.SLEEP_ONLY) "수면 점수" else "컨디션")
                    result.band?.let { band ->
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(band.label, color = band.color, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                            Text(band.advice, color = Palette.Body, fontSize = 15.sp, lineHeight = 21.sp)
                        }
                    }
                }
                androidx.compose.material3.HorizontalDivider(color = Palette.Line)
                Text(result.reason, color = Palette.Navy, fontSize = 17.sp, lineHeight = 24.sp, fontWeight = FontWeight.Medium)
                if (result.badges.isNotEmpty()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        result.badges.forEach { Chip(it.label, Palette.Muted) }
                    }
                }
                if (state.learning) LearningProgress(state.dayIndex)
            }
        }
    }
}

/** SYS-01: 진행률과 "언제부터 무엇이 되는지". */
@Composable
private fun LearningProgress(dayIndex: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        LinearProgressIndicator(
            progress = { dayIndex / 7f },
            color = Palette.Teal,
            trackColor = Palette.Line,
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
        )
        val next = if (dayIndex <= 3) "4일째부터 심박·HRV를 더한 컨디션 점수를 보여드려요" else "8일째부터 내 평소 기준이 완성돼요"
        Text("내 평소를 배우는 중 · 7일 중 ${dayIndex}일째. $next", color = Palette.Muted, fontSize = 13.sp, lineHeight = 18.sp)
    }
}

/** SYS-02: 점수 대신 오늘 느낌을 받아 미션을 고릅니다. */
@Composable
private fun NoDataScore(result: ScoreResult, onFeeling: (Int) -> Unit) {
    Text(result.reason, color = Palette.Navy, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        listOf(1 to "아주 나쁨", 2 to "나쁨", 3 to "보통", 4 to "좋음", 5 to "아주 좋음").forEach { (value, label) ->
            OutlinedButton(
                onClick = { onFeeling(value) },
                border = BorderStroke(1.dp, Palette.Line),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
                modifier = Modifier.weight(1f).height(56.dp),
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$value", color = Palette.Navy, fontWeight = FontWeight.Bold)
                    Text(label, color = Palette.Muted, fontSize = 10.sp)
                }
            }
        }
    }
    Text("밤에도 워치를 차면 내일 아침 점수를 볼 수 있어요", color = Palette.Muted, fontSize = 13.sp)
}

@Composable
private fun MissionCard(
    mission: Mission,
    done: Boolean,
    check: Check,
    canSwap: Boolean,
    onComplete: () -> Unit,
    onSwap: () -> Unit,
    onBreathing: (() -> Unit)? = null,
) {
    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Text("오늘의 미션", color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Text("레벨 ${mission.level} · ${mission.points}점", color = Palette.Muted, fontSize = 13.sp)
        }
        Text(mission.title, color = Palette.Navy, fontSize = 22.sp, fontWeight = FontWeight.Bold, lineHeight = 30.sp)
        if (!done) Text(missionHint(mission, check), color = Palette.Muted, fontSize = 13.sp, lineHeight = 18.sp)
        if (done) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(10.dp).clip(CircleShape).background(Palette.Teal))
                Text(
                    if (check == Check.DONE) "워치 기록으로 완료를 확인했어요" else "완료했어요. 내일 또 만나요",
                    color = Palette.Teal,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Button(
                    onClick = onComplete,
                    colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                    shape = RoundedCornerShape(12.dp),
                ) { Text(if (onBreathing != null) "직접 했어요" else "완료했어요") }
                Spacer(Modifier.width(8.dp))
                onBreathing?.let {
                    OutlinedButton(onClick = it, border = BorderStroke(1.dp, Palette.Teal), shape = RoundedCornerShape(12.dp)) {
                        Text("호흡 시작", color = Palette.Teal)
                    }
                    Spacer(Modifier.width(8.dp))
                }
                if (canSwap) TextButton(onClick = onSwap) { Text("다른 미션", color = Palette.Muted) }
            }
        }
    }
}

/** 미션을 어떻게 확인하는지 한 줄로. */
internal fun missionHint(mission: Mission, check: Check): String = when {
    mission.id == "P-08" -> "기록 탭 > 진료용 요약 PDF를 만들어 보내면 완료돼요. 부모님 폰에서 만들어 받았다면 직접 체크해 주세요"
    mission.id in MissionVerifier.BREATHING_MISSIONS && mission.id != "R-05" -> "앱 호흡 가이드를 끝까지 하면 자동으로 확인해요"
    mission.id == "C-07" -> "아래에서 마실 때마다 한 잔씩 눌러 주세요. 6잔이면 완료돼요"
    mission.id == "C-08" -> "아래 \"어제는 어땠나요?\"를 남기면 완료돼요"
    check == Check.MANUAL || mission.verification == Verification.MANUAL -> "하고 나서 직접 체크해 주세요"
    mission.id in MissionVerifier.NIGHT_MISSIONS -> "오늘 밤 수면 기록으로 내일 아침 자동으로 확인해요"
    check == Check.MISSED -> "기록에서 아직 확인되지 않았어요. 했다면 직접 체크해 주세요"
    else -> "워치 기록으로 자동 확인해요. 워치가 없을 땐 직접 체크해도 돼요"
}

/** 일요일 저녁 주간 리포트 (기획서 14번). 올리기는 묻고, 내리기는 이미 적용된 걸 부드럽게 알립니다. */
@Composable
private fun WeeklyCard(summary: WeeklySummary, onAccept: () -> Unit, onClose: () -> Unit, onChangeGoal: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Palette.Navy),
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier
                .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Palette.DeepStart, Palette.DeepEnd)))
                .padding(22.dp),
        ) {
            Text("이번 주 리포트", color = Palette.Mint, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Text(summary.title, color = Palette.Paper, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            WeekDots(summary.daysDone)
            summary.lines.forEach { Text(it, color = Palette.Line, fontSize = 15.sp, lineHeight = 22.sp) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                when {
                    summary.suggestGoalChange -> {
                        Button(onClick = onChangeGoal, colors = ButtonDefaults.buttonColors(containerColor = Palette.Mint), shape = RoundedCornerShape(12.dp)) {
                            Text("목표 바꾸기", color = Palette.Navy)
                        }
                        TextButton(onClick = onClose) { Text("이대로 할게요", color = Palette.Line) }
                    }
                    summary.levelChange == MissionProgress.LevelChange.SUGGEST_UP -> {
                        Button(onClick = onAccept, colors = ButtonDefaults.buttonColors(containerColor = Palette.Mint), shape = RoundedCornerShape(12.dp)) {
                            Text("레벨 ${summary.nextLevel} 도전", color = Palette.Navy)
                        }
                        TextButton(onClick = onClose) { Text("지금이 좋아요", color = Palette.Line) }
                    }
                    else -> TextButton(onClick = onClose) { Text("확인", color = Palette.Mint, fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}

/** 이번 주 완료한 날 수를 점 7개로. 5개부터 배지. */
@Composable
private fun WeekDots(done: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(7) { i ->
            Box(Modifier.size(12.dp).clip(CircleShape).background(if (i < done) Palette.Mint else Palette.Body))
        }
    }
}

@Composable
private fun AlertCard(
    alert: AlertMessage,
    detection: Detection?,
    response: FeedbackResponse?,
    suggestSnooze: Boolean,
    snoozedUntil: LocalDate?,
    onFeedback: (Detection, FeedbackResponse) -> Unit,
    onSnooze: (Signal, Boolean) -> Unit,
    onUnsnooze: (Signal) -> Unit,
    onBreathing: (() -> Unit)? = null,
) {
    SectionCard {
        Text(alert.title, color = Palette.Navy, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text(alert.body, color = Palette.Body, fontSize = 15.sp, lineHeight = 22.sp)
        onBreathing?.let {
            OutlinedButton(onClick = it, border = BorderStroke(1.dp, Palette.Teal)) { Text("1분 호흡 시작", color = Palette.Teal) }
        }
        // 정보 등급(수면 부족 등)은 코칭이라 응답을 받지 않고, 주의 신호만 맞는지 묻습니다.
        if (detection == null || detection.signal.grade != Grade.CAUTION) return@SectionCard
        when {
            snoozedUntil != null -> Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "${snoozedUntil.monthValue}/${snoozedUntil.dayOfMonth}까지 이 알림은 쉬는 중이에요",
                    color = Palette.Muted,
                    fontSize = 13.sp,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = { onUnsnooze(detection.signal) }) { Text("다시 받기", color = Palette.Teal) }
            }
            suggestSnooze -> Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("최근 이 알림이 두 번 틀렸다고 하셨어요. 7일 동안 쉴까요?", color = Palette.Navy, fontSize = 14.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { onSnooze(detection.signal, true) }) { Text("7일 쉬기", color = Palette.Navy) }
                    TextButton(onClick = { onSnooze(detection.signal, false) }) { Text("계속 받기", color = Palette.Muted) }
                }
            }
            response != null -> Text(
                if (response == FeedbackResponse.FALSE_ALARM) "알려 주셔서 고마워요. 알림 기준을 고치는 데 써요."
                else "답해 주셔서 고마워요. 더 나빠지지 않으면 24시간 동안 다시 알리지 않아요.",
                color = Palette.Teal,
                fontSize = 13.sp,
            )
            else -> Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { onFeedback(detection, FeedbackResponse.OK) }) { Text(FeedbackResponse.OK.label, color = Palette.Navy) }
                TextButton(onClick = { onFeedback(detection, FeedbackResponse.FALSE_ALARM) }) {
                    Text(FeedbackResponse.FALSE_ALARM.label, color = Palette.Muted)
                }
            }
        }
    }
}

@Composable
private fun PermissionBanner(onOpen: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Palette.Navy),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 16.dp, end = 4.dp, top = 4.dp, bottom = 4.dp)) {
            Text(
                "일부 건강 데이터 권한이 꺼져 있어 수면 위주로 계산했어요",
                color = Palette.Paper,
                fontSize = 13.sp,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onOpen) { Text("켜기", color = Palette.Mint, fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun Chip(text: String, color: Color) {
    Text(
        text,
        color = color,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 10.dp, vertical = 3.dp),
    )
}
