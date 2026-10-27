package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource.DiagnosticRow
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.score.Metric
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** 테스트 도구에 보여줄 것. */
data class Diagnostics(
    val healthConnectAvailable: Boolean,
    val backgroundSupported: Boolean,
    val backgroundGranted: Boolean,
    val notificationsAllowed: Boolean,
    val rows: List<DiagnosticRow>,
    val home: HomeState?,
    val nextMorning: Long?,
    val nextEvening: Long?,
    /** 가족 서버 주소 (빈 값이면 설정 전). */
    val serverUrl: String = "",
    val familyAccount: Boolean = false,
    val guardianCount: Int = 0,
    val pushConfigured: Boolean = false,
    val pushToken: Boolean = false,
)

private val METRIC_LABELS = mapOf(
    Metric.SLEEP_DURATION to "수면 시간",
    Metric.SLEEP_QUALITY to "수면 질",
    Metric.REGULARITY to "규칙성",
    Metric.HRV to "HRV",
    Metric.RESTING_HR to "안정시 심박",
    Metric.ACTIVITY_LOAD to "활동 부하",
    Metric.SKIN_TEMP to "피부 온도",
    Metric.RESPIRATORY_RATE to "호흡수",
)

private val TIME = DateTimeFormatter.ofPattern("M/d HH:mm")

private fun Instant.local(): String = atZone(ZoneId.systemDefault()).format(TIME)

/**
 * 실기기 테스트용 화면 (디버그 빌드에서만). Health Connect에서 무엇이 들어왔는지,
 * 오늘 점수가 어떻게 계산됐는지 보고, 아침·저녁·주간 알림을 지금 바로 실행해 봅니다.
 */
@Composable
fun DiagnosticsContent(
    d: Diagnostics?,
    onRunMorning: () -> Unit,
    onRunEvening: () -> Unit,
    onRunWeekly: () -> Unit,
    onReload: () -> Unit,
    onBack: () -> Unit,
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
            Text("테스트 도구", color = Palette.Navy, fontSize = 26.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            TextButton(onClick = onReload) { Text("새로고침", color = Palette.Teal) }
            TextButton(onClick = onBack) { Text("닫기", color = Palette.Teal) }
        }
        if (d == null) {
            Text("불러오는 중이에요", color = Palette.Muted)
            return@Column
        }

        Box("상태") {
            Line("Health Connect", if (d.healthConnectAvailable) "사용 가능" else "없음 · 설치 필요", d.healthConnectAvailable)
            Line("백그라운드 읽기 지원", if (d.backgroundSupported) "지원" else "미지원 · 아침 알림은 점수 없이", d.backgroundSupported)
            Line("백그라운드 읽기 권한", if (d.backgroundGranted) "허용" else "꺼짐", d.backgroundGranted)
            Line("알림 권한", if (d.notificationsAllowed) "허용" else "꺼짐 · 알림이 오지 않아요", d.notificationsAllowed)
            Line("다음 아침 리포트", d.nextMorning?.let { Instant.ofEpochMilli(it).local() } ?: "예약 없음", d.nextMorning != null)
            Line("다음 저녁 요약", d.nextEvening?.let { Instant.ofEpochMilli(it).local() } ?: "예약 없음", d.nextEvening != null)
        }

        Box("가족 서버") {
            Line("서버", d.serverUrl.ifEmpty { "설정 전 · 가족 기능 꺼짐" }, d.serverUrl.isNotEmpty())
            Line("가족 계정", if (d.familyAccount) "있음 · 보호자 ${d.guardianCount}명" else "없음 · 가족 탭에서 시작", d.familyAccount)
            Line("푸시 설정", if (d.pushConfigured) "있음" else "없음 · 긴급 알림을 받을 수 없어요", d.pushConfigured)
            Line("푸시 토큰", if (d.pushToken) "받음" else "없음", d.pushToken)
        }

        Box("지난 30일 Health Connect 기록") {
            d.rows.forEach { r ->
                val detail = when {
                    !r.granted -> "권한 없음"
                    r.count == 0 -> "기록 없음"
                    else -> "${r.count}개 · 최근 ${r.latest?.local() ?: "-"} · ${r.sources.joinToString()}"
                }
                Line(r.label, detail, r.granted && r.count > 0)
            }
            Text(
                "갤럭시 워치 기록이 없으면 삼성 헬스 > 설정 > Health Connect에서 동기화를 켜 주세요.",
                color = Palette.Muted,
                fontSize = 12.sp,
                lineHeight = 17.sp,
            )
        }

        d.home?.let { home ->
            Box("오늘 계산 (${home.dayIndex}일째)") {
                val s = home.score
                Line("종류", s.kind.name, true)
                Line("점수", s.score?.toString() ?: "-", s.score != null)
                Line("이유", s.reason, true)
                if (s.badges.isNotEmpty()) Line("배지", s.badges.joinToString { it.label }, true)
                s.cap?.let { Line("상한", "${it.name} (최대 ${it.max})", true) }
                s.subScores.forEach { (m, v) ->
                    Line(METRIC_LABELS.getValue(m), "%.1f".format(v) + " · 가중치 ${(m.weight * 100).toInt()}%", true)
                }
                Line("미션", "${home.mission.id} ${home.mission.title}", true)
                Line("미션 확인", "${home.missionCheck.name}${if (home.missionDone) " · 완료" else ""}", true)
                Line("감지된 신호", home.alertDetections.joinToString { it.signal.name }.ifEmpty { "없음" }, true)
            }
        }

        Box("지금 실행해 보기") {
            Text("정해진 시각을 기다리지 않고 알림을 한 번 보내요. 정기 예약은 그대로예요.", color = Palette.Muted, fontSize = 13.sp)
            RunButton("아침 리포트 보내기", onRunMorning)
            RunButton("저녁 요약 보내기", onRunEvening)
            RunButton("주간 리포트 만들기", onRunWeekly)
        }
    }
}

@Composable
private fun Box(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Card(
            colors = CardDefaults.cardColors(containerColor = Palette.Card),
            border = BorderStroke(1.dp, Palette.Line),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(16.dp)) { content() }
        }
    }
}

@Composable
private fun Line(label: String, value: String, ok: Boolean) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
        Text(label, color = Palette.Body, fontSize = 13.sp, modifier = Modifier.weight(0.38f))
        Text(
            value,
            color = if (ok) Palette.Navy else Palette.Coral,
            fontSize = 13.sp,
            fontFamily = FontFamily.Monospace,
            lineHeight = 18.sp,
            modifier = Modifier.weight(0.62f),
        )
    }
}

@Composable
private fun RunButton(label: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = Palette.Navy),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) { Text(label) }
}
