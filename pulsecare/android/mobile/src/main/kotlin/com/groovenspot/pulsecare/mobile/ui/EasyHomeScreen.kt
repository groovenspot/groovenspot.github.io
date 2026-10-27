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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.FeedbackResponse
import com.groovenspot.pulsecare.alert.Grade
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.ScoreResult
import kotlinx.coroutines.delay
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/** SOS만 빨강 (기획서 12번: 빨강은 긴급에만). */
private val Emergency = Color(0xFFD64545)

/**
 * 쉽게 보기 홈 (기획서 14번 시니어 모드): 오늘 컨디션 → 오늘 할 일 하나 → 큰 버튼 두 개(보호자에게 전화, 도움 요청).
 * 점수 배지·"다른 미션"·학습 진행률처럼 판단이 필요한 요소는 뺍니다. 글자 배율(1.25배)은 바깥에서 적용합니다.
 */
@Composable
fun EasyHomeContent(
    state: HomeState,
    onCompleteMission: () -> Unit,
    onFeeling: (Int) -> Unit,
    /** 연락할 보호자 (이름, 전화번호). 없으면 버튼을 숨깁니다. */
    guardian: Pair<String, String>?,
    onCall: (String) -> Unit,
    onSos: () -> Unit,
    alertFeedback: Map<com.groovenspot.pulsecare.alert.Signal, FeedbackResponse> = emptyMap(),
    onAlertFeedback: (Detection, FeedbackResponse) -> Unit = { _, _ -> },
    onOpenSettings: () -> Unit = {},
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(18.dp),
        modifier = Modifier
            .fillMaxSize()
            .background(Palette.Paper)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                state.date.format(DateTimeFormatter.ofPattern("M월 d일")) + " " + state.date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.KOREAN),
                color = Palette.Navy,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onOpenSettings) { Text("내 정보", color = Palette.Teal, fontSize = 16.sp) }
        }

        BigCard {
            val score = state.score
            if (score.kind == ScoreResult.Kind.NO_DATA) {
                Text("오늘 몸은 어떠세요?", color = Palette.Navy, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Text("어젯밤 워치 기록이 없어요", color = Palette.Muted, fontSize = 16.sp)
                listOf(4 to "좋아요", 3 to "보통이에요", 2 to "안 좋아요").forEach { (value, label) ->
                    OutlinedButton(
                        onClick = { onFeeling(value) },
                        border = BorderStroke(1.5.dp, Palette.Line),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth().height(60.dp),
                    ) { Text(label, color = Palette.Navy, fontSize = 20.sp) }
                }
            } else {
                Text("오늘 컨디션", color = Palette.Muted, fontSize = 18.sp)
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("${score.score}", color = Palette.Navy, fontSize = 72.sp, fontWeight = FontWeight.Bold, lineHeight = 72.sp)
                    score.band?.let { Text(it.label, color = it.color, fontSize = 28.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 10.dp)) }
                }
                Text(score.reason, color = Palette.Body, fontSize = 20.sp, lineHeight = 28.sp)
            }
        }

        BigCard {
            Text("오늘 할 일", color = Palette.Teal, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(state.mission.title, color = Palette.Navy, fontSize = 26.sp, fontWeight = FontWeight.Bold, lineHeight = 34.sp)
            if (state.missionDone) {
                Text("잘하셨어요! 오늘 할 일을 마쳤어요", color = Palette.Teal, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
            } else {
                Button(
                    onClick = onCompleteMission,
                    colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().height(64.dp),
                ) { Text("했어요", fontSize = 22.sp, fontWeight = FontWeight.Bold) }
            }
        }

        // 주의 알림만 크게. 정보 알림(수면 부족 등)은 아침 리포트로 충분합니다.
        state.alerts.forEachIndexed { i, alert ->
            val d = state.alertDetections.getOrNull(i) ?: return@forEachIndexed
            if (d.signal.grade != Grade.CAUTION) return@forEachIndexed
            BigCard {
                Text(alert.title, color = Palette.Amber, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text(alert.body, color = Palette.Body, fontSize = 18.sp, lineHeight = 26.sp)
                if (alertFeedback[d.signal] == null) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(onClick = { onAlertFeedback(d, FeedbackResponse.OK) }, modifier = Modifier.weight(1f).height(56.dp)) {
                            Text("괜찮아요", color = Palette.Navy, fontSize = 18.sp)
                        }
                        OutlinedButton(onClick = { onAlertFeedback(d, FeedbackResponse.FALSE_ALARM) }, modifier = Modifier.weight(1f).height(56.dp)) {
                            Text("틀렸어요", color = Palette.Muted, fontSize = 18.sp)
                        }
                    }
                } else {
                    Text("알려 주셔서 고마워요", color = Palette.Teal, fontSize = 18.sp)
                }
            }
        }

        guardian?.let { (name, phone) ->
            OutlinedButton(
                onClick = { onCall(phone) },
                border = BorderStroke(2.dp, Palette.Teal),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth().height(68.dp),
            ) { Text("${name}에게 전화", color = Palette.Teal, fontSize = 22.sp, fontWeight = FontWeight.Bold) }
        }
        Button(
            onClick = onSos,
            colors = ButtonDefaults.buttonColors(containerColor = Emergency),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth().height(68.dp),
        ) { Text("도움 요청 (SOS)", fontSize = 22.sp, fontWeight = FontWeight.Bold) }
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun BigCard(content: @Composable () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Palette.Card),
        border = BorderStroke(1.dp, Palette.Line),
        shape = RoundedCornerShape(22.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.padding(22.dp)) { content() }
    }
}

/** 폰 SOS 진행 상태: 5초 취소 → 보내는 중 → 결과(제목, 설명, 취소 가능 여부). */
sealed interface PhoneSos {
    data object Countdown : PhoneSos
    data object Sending : PhoneSos
    data class Done(val title: String, val detail: String, val emergencyId: String?) : PhoneSos
}

/**
 * 폰에서 누르는 SOS. 잘못 누른 경우를 위해 5초 동안 취소할 수 있고, 결과(보호자 몇 명에게 갔는지)를 그대로 보여 줍니다.
 * 119는 자동으로 걸지 않고 버튼으로 바로 전화 화면을 엽니다.
 */
@Composable
fun PhoneSosDialog(state: PhoneSos, onSend: () -> Unit, onCancel: () -> Unit, onCancelSent: (String) -> Unit, onCall119: () -> Unit) {
    var seconds by remember { mutableIntStateOf(5) }
    LaunchedEffect(state) {
        if (state != PhoneSos.Countdown) return@LaunchedEffect
        seconds = 5
        while (seconds > 0) {
            delay(1_000)
            seconds--
        }
        onSend()
    }
    AlertDialog(
        onDismissRequest = { if (state !is PhoneSos.Sending) onCancel() },
        title = {
            Text(
                when (state) {
                    PhoneSos.Countdown -> "${seconds}초 뒤 보호자에게 알려요"
                    PhoneSos.Sending -> "보호자에게 알리는 중이에요"
                    is PhoneSos.Done -> state.title
                },
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
            )
        },
        text = {
            Text(
                when (state) {
                    PhoneSos.Countdown -> "잘못 눌렀으면 취소를 눌러 주세요."
                    PhoneSos.Sending -> "잠시만 기다려 주세요."
                    is PhoneSos.Done -> state.detail
                },
                fontSize = 18.sp,
                lineHeight = 26.sp,
            )
        },
        confirmButton = {
            when (state) {
                PhoneSos.Countdown -> TextButton(onClick = onCancel) { Text("취소", fontSize = 20.sp) }
                PhoneSos.Sending -> Unit
                is PhoneSos.Done -> TextButton(onClick = onCall119) { Text("119 전화", color = Emergency, fontSize = 20.sp) }
            }
        },
        dismissButton = {
            if (state is PhoneSos.Done) {
                Row {
                    state.emergencyId?.let { id -> TextButton(onClick = { onCancelSent(id) }) { Text("괜찮아요, 취소", fontSize = 18.sp) } }
                    TextButton(onClick = onCancel) { Text("닫기", fontSize = 18.sp) }
                }
            }
        },
    )
}
