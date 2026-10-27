package com.groovenspot.pulsecare.mobile.ui

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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.alert.FeedbackResponse
import com.groovenspot.pulsecare.mission.Mission
import com.groovenspot.pulsecare.mobile.family.EmergencyView
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/**
 * 워치 없는 보호자의 "부모님" 탭: 긴급 → 부모님 오늘 카드 → 오늘의 보호자 미션.
 * 가족 데이터는 [FamilyUi]를 그대로 쓰고, 미션만 따로 받습니다. 상태만 받아 그립니다.
 */
@Composable
fun GuardianHomeContent(
    date: LocalDate,
    ui: FamilyUi,
    mission: Mission?,
    missionDone: Boolean,
    onCompleteMission: () -> Unit,
    onOpenFamily: () -> Unit,
    onAck: (EmergencyView) -> Unit,
    onCall: (String) -> Unit,
    onAlertFeedback: (String, FeedbackResponse) -> Unit,
    onOpenSettings: () -> Unit,
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
                Text(
                    date.format(DateTimeFormatter.ofPattern("M월 d일")) + " " + date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.KOREAN),
                    color = Palette.Muted,
                    fontSize = 14.sp,
                )
                Text("부모님 오늘", color = Palette.Navy, fontSize = 26.sp, fontWeight = FontWeight.Bold)
            }
            TextButton(onClick = onOpenSettings) { Text("내 정보", color = Palette.Teal, fontWeight = FontWeight.SemiBold) }
        }
        ui.error?.let { Text(it, color = Palette.Coral, fontSize = 14.sp) }

        val wearers = ui.family?.wearers.orEmpty()
        wearers.flatMap { w -> w.emergencies.map { w to it } }.forEach { (w, e) -> EmergencyCard(w, e, ui, onAck, onCall) }
        when {
            !ui.configured -> FamilyPanel {
                Text("가족 연결 준비 중", color = Palette.Navy, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Text("이 테스트 빌드에는 가족 서버 주소가 없어 부모님 요약을 볼 수 없어요.", color = Palette.Body, fontSize = 14.sp, lineHeight = 20.sp)
            }
            ui.me == null || (ui.family != null && wearers.isEmpty()) -> FamilyPanel {
                Text("아직 연결된 부모님이 없어요", color = Palette.Navy, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Text(
                    "부모님 폰에 펄스케어를 설치하고 초대 코드를 입력하면, 매일 컨디션과 미션, 주의 알림을 여기서 함께 봐요. SOS를 누르면 바로 알려 드려요.",
                    color = Palette.Body,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                )
                Button(
                    onClick = onOpenFamily,
                    colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(if (ui.me == null) "가족 연결 시작하기" else "부모님 초대하기") }
            }
            ui.family == null -> Text("부모님 소식을 불러오는 중이에요", color = Palette.Muted)
            else -> wearers.forEach { WearerCard(it, onCall, onAlertFeedback) }
        }

        mission?.let { m ->
            FamilyPanel {
                Text("오늘의 보호자 미션", color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                Text(m.title, color = Palette.Navy, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text(missionHint(m, com.groovenspot.pulsecare.mission.Check.MANUAL), color = Palette.Muted, fontSize = 13.sp, lineHeight = 18.sp)
                if (missionDone) {
                    Text("완료했어요", color = Palette.Teal, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                } else {
                    Button(
                        onClick = onCompleteMission,
                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                        shape = RoundedCornerShape(12.dp),
                    ) { Text("완료했어요") }
                }
            }
        }
        Spacer(Modifier.height(8.dp))
    }
}
