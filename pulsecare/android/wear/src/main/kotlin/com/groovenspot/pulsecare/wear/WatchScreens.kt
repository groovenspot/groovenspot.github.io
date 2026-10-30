package com.groovenspot.pulsecare.wear

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import com.groovenspot.pulsecare.watch.WatchContract
import com.groovenspot.pulsecare.watch.WatchDisplay
import com.groovenspot.pulsecare.watch.WatchToday

enum class SosState { COUNTDOWN, SENT, NO_PHONE }

/** 워치 앱 첫 화면: 점수 → 이유 → 미션(완료 버튼) → SOS. 상태만 받아 그립니다. */
@Composable
fun WatchHomeContent(
    today: WatchToday?,
    display: WatchDisplay,
    onDone: () -> Unit,
    onSos: () -> Unit,
    /** 스크린샷 테스트에서 아래쪽(미션·SOS)을 보려고. */
    initialScroll: Int = 0,
) {
    MaterialTheme {
        // 항목이 몇 개 안 돼 일반 스크롤 열로 그립니다 (첫 화면에 점수가 바로 보이게).
        val scroll = rememberScrollState(initialScroll)
        Scaffold(timeText = { TimeText() }, positionIndicator = { PositionIndicator(scroll) }) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxSize().verticalScroll(scroll).padding(start = 26.dp, end = 26.dp, top = 30.dp, bottom = 48.dp),
            ) {
                Text("오늘의 컨디션", color = WatchColors.Muted, fontSize = 13.sp)
                Text(display.score, color = Color.White, fontSize = 52.sp, fontWeight = FontWeight.Bold)
                Text(
                    display.label,
                    color = if (display.stale) WatchColors.Muted else WatchColors.band(today?.band),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(display.reason, color = Color.White, fontSize = 14.sp, textAlign = TextAlign.Center)
                if (display.mission.isNotEmpty()) {
                    Text("오늘의 미션", color = WatchColors.Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
                    Text(display.mission, color = Color.White, fontSize = 15.sp, textAlign = TextAlign.Center)
                    if (display.missionDone) {
                        Text("완료했어요", color = WatchColors.Mint, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    } else if (!display.stale) {
                        Chip(
                            onClick = onDone,
                            label = { Text("미션 완료") },
                            colors = ChipDefaults.primaryChipColors(backgroundColor = WatchColors.Mint, contentColor = Color.Black),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
                Chip(
                    onClick = onSos,
                    label = { Text("SOS 도움 요청") },
                    colors = ChipDefaults.primaryChipColors(backgroundColor = WatchColors.Emergency),
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
            }
        }
    }
}

/**
 * SOS: 잘못 누른 경우를 위해 5초 동안 취소할 수 있고, 그다음 휴대폰이 보호자에게 알립니다.
 * 보호자에게 갔는지(몇 명에게), 못 갔는지를 폰의 답을 받아 그대로 보여줍니다.
 */
@Composable
fun SosContent(
    state: SosState,
    seconds: Int,
    onCancel: () -> Unit,
    onClose: () -> Unit,
    /** 폰이 돌려준 결과 ([WatchContract.sosText]). 아직 없으면 null. */
    result: String? = null,
) {
    MaterialTheme {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterVertically),
            modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp, vertical = 28.dp),
        ) {
            when (state) {
                SosState.COUNTDOWN -> {
                    Text("$seconds", color = WatchColors.Emergency, fontSize = 48.sp, fontWeight = FontWeight.Bold)
                    Text("${seconds}초 후 휴대폰에 알려요", color = Color.White, fontSize = 14.sp, textAlign = TextAlign.Center)
                    Button(
                        onClick = onCancel,
                        colors = ButtonDefaults.secondaryButtonColors(),
                    ) { Text("취소") }
                }
                SosState.SENT, SosState.NO_PHONE -> {
                    val (title, detail) = if (state == SosState.SENT) {
                        WatchContract.sosText(result)
                    } else {
                        "휴대폰과 연결되지 않았어요" to "위급하면 워치 긴급 SOS(홈 버튼 5번)나 119를 쓰세요."
                    }
                    val reached = state == SosState.SENT && result?.startsWith("SENT:") == true && result != WatchContract.sosSent(0)
                    Text(
                        title,
                        color = if (reached || (state == SosState.SENT && result == null)) Color.White else WatchColors.Coral,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                    Text(detail, color = WatchColors.Muted, fontSize = 12.sp, textAlign = TextAlign.Center)
                    Button(onClick = onClose, colors = ButtonDefaults.secondaryButtonColors()) { Text("닫기") }
                }
            }
        }
    }
}
