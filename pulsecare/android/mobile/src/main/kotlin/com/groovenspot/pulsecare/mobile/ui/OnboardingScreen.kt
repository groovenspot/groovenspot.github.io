package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.mission.Goal

private val GOAL_HINTS = mapOf(
    Goal.SLEEP to "잠드는 시간과 수면의 질을 챙겨요",
    Goal.WEIGHT to "걷기와 운동량을 조금씩 늘려요",
    Goal.STRESS to "호흡과 쉬는 시간으로 회복을 도와요",
    Goal.PARENT to "멀리 계신 부모님의 하루를 함께 챙겨요",
)

/** 온보딩 1단계: 목표 1개 고르기 (기획서 14번: 목표는 1개만). */
@Composable
fun GoalScreen(selected: Goal?, onSelect: (Goal) -> Unit, onNext: () -> Unit) {
    OnboardingFrame(
        step = "1 / 2",
        title = "어떤 걸 가장 챙기고 싶으세요?",
        subtitle = "매일 이 목표에 맞는 미션을 하나씩 드려요. 나중에 바꿀 수 있어요.",
        primary = "다음",
        primaryEnabled = selected != null,
        onPrimary = onNext,
    ) {
        GOAL_HINTS.forEach { (goal, hint) ->
            val chosen = goal == selected
            Card(
                colors = CardDefaults.cardColors(containerColor = if (chosen) Palette.Teal.copy(alpha = 0.08f) else Palette.Card),
                border = BorderStroke(if (chosen) 2.dp else 1.dp, if (chosen) Palette.Teal else Palette.Line),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth().clickable { onSelect(goal) },
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(goal.label, color = Palette.Navy, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text(hint, color = Palette.Muted, fontSize = 14.sp)
                }
            }
        }
    }
}

/** 온보딩 2단계: Health Connect 연결. 워치 앱(삼성 헬스 등)이 Health Connect에 쓴 기록을 읽습니다. */
@Composable
fun ConnectScreen(available: Boolean, onConnect: () -> Unit, onInstall: () -> Unit, onLater: (() -> Unit)?) {
    OnboardingFrame(
        step = "2 / 2",
        title = "워치 기록을 연결해 주세요",
        subtitle = if (available) {
            "Health Connect에서 수면·심박·HRV·걸음을 읽어 매일 아침 점수를 계산해요. " +
                "갤럭시 워치는 삼성 헬스 설정에서 Health Connect 동기화를 켜 주세요."
        } else {
            "이 휴대폰에 Health Connect가 없어요. 설치하면 워치 기록을 읽을 수 있어요."
        },
        primary = if (available) "Health Connect 연결" else "Health Connect 설치",
        primaryEnabled = true,
        onPrimary = if (available) onConnect else onInstall,
        secondary = onLater?.let { "나중에" to it },
    ) {
        listOf(
            "건강 수치는 이 휴대폰에서만 계산하고, 회사·보험사에 보내지 않아요",
            "읽기만 하고, Health Connect에 아무것도 쓰지 않아요",
            "진단이나 치료가 아닌 생활 습관 코칭이에요",
        ).forEach { Text("· $it", color = Palette.Body, fontSize = 15.sp, lineHeight = 22.sp) }
    }
}

@Composable
private fun OnboardingFrame(
    step: String,
    title: String,
    subtitle: String,
    primary: String,
    primaryEnabled: Boolean,
    onPrimary: () -> Unit,
    secondary: Pair<String, () -> Unit>? = null,
    content: @Composable () -> Unit,
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize().background(Palette.Paper).safeDrawingPadding().padding(24.dp),
    ) {
        Text(step, color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Text(title, color = Palette.Navy, fontSize = 26.sp, fontWeight = FontWeight.Bold, lineHeight = 34.sp)
        Text(subtitle, color = Palette.Muted, fontSize = 15.sp, lineHeight = 22.sp)
        Spacer(Modifier.height(8.dp))
        content()
        Spacer(Modifier.weight(1f))
        Button(
            onClick = onPrimary,
            enabled = primaryEnabled,
            colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) { Text(primary, fontSize = 16.sp) }
        secondary?.let { (label, action) ->
            TextButton(onClick = action, modifier = Modifier.fillMaxWidth()) { Text(label, color = Palette.Muted) }
        }
    }
}
