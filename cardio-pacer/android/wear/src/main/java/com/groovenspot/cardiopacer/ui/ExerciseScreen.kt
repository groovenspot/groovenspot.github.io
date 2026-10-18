package com.groovenspot.cardiopacer.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.groovenspot.cardiopacer.R
import com.groovenspot.cardiopacer.exercise.ExerciseUiState
import com.groovenspot.cardiopacer.exercise.Phase
import com.groovenspot.cardiopacer.zone.DurationFormatter
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Step 2: the colour screen. Swipe left (or long-press) for pause / end.
 * Swiping right goes back to the watch face; the workout keeps running and
 * the ongoing-activity icon brings you back.
 */
@Composable
fun ExerciseScreen(
    state: ExerciseUiState,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onEnd: () -> Unit,
) {
    val pagerState = rememberPagerState(pageCount = { 2 })
    val scope = rememberCoroutineScope()
    val haptics = LocalHapticFeedback.current

    HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
        when (page) {
            0 -> MetricsPage(
                state = state,
                onLongPress = {
                    haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                    scope.launch { pagerState.animateScrollToPage(1) }
                },
            )
            else -> ControlsPage(
                state = state,
                onTogglePause = {
                    if (state.phase == Phase.PAUSED) onResume() else onPause()
                    scope.launch { pagerState.animateScrollToPage(0) }
                },
                onEnd = onEnd,
            )
        }
    }
}

@Composable
internal fun MetricsPage(state: ExerciseUiState, onLongPress: () -> Unit) {
    val zone = state.zone
    val paused = state.phase == Phase.PAUSED
    val base = zone?.color ?: PacerColors.Waiting
    val background by animateColorAsState(
        targetValue = if (paused) base.copy(alpha = 0.45f) else base,
        animationSpec = tween(250),
        label = "zoneColor",
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .background(background)
            .pointerInput(Unit) { detectTapGestures(onLongPress = { onLongPress() }) },
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 20.dp),
        ) {
            Text(
                text = if (paused) "일시정지" else zone?.title ?: "측정 중…",
                fontSize = 15.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
            )
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = state.heartRate?.let { "%.0f".format(it) } ?: "--",
                    fontSize = 60.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    maxLines = 1,
                )
                Column(modifier = Modifier.padding(start = 2.dp, bottom = 12.dp)) {
                    Icon(
                        painter = painterResource(R.drawable.ic_heart),
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(14.dp),
                    )
                    Text("BPM", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color.White)
                }
            }
            Text(
                text = zone?.message ?: "심박수를 측정하고 있어요",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White.copy(alpha = 0.9f),
                textAlign = TextAlign.Center,
                maxLines = 2,
            )
            Spacer(Modifier.height(6.dp))
            ElapsedTime(state)
        }
    }
}

@Composable
private fun ElapsedTime(state: ExerciseUiState) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = System.currentTimeMillis()
            delay(1_000)
        }
    }
    Text(
        text = DurationFormatter.clock(state.elapsedMillis(now)),
        fontSize = 20.sp,
        fontWeight = FontWeight.Bold,
        color = Color.White,
    )
}

@Composable
private fun ControlsPage(state: ExerciseUiState, onTogglePause: () -> Unit, onEnd: () -> Unit) {
    val paused = state.phase == Phase.PAUSED
    val enabled = state.phase == Phase.RUNNING || state.phase == Phase.PAUSED

    Row(
        horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxSize().background(Color.Black),
    ) {
        ControlButton(label = "종료", glyph = "■", color = PacerColors.Red, enabled = enabled, onClick = onEnd)
        ControlButton(
            label = if (paused) "재개" else "정지",
            glyph = if (paused) "▶" else "❚❚",
            color = PacerColors.Yellow,
            enabled = enabled,
            onClick = onTogglePause,
        )
    }
}

@Composable
private fun ControlButton(label: String, glyph: String, color: Color, enabled: Boolean, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Button(
            onClick = onClick,
            enabled = enabled,
            colors = ButtonDefaults.buttonColors(backgroundColor = color.copy(alpha = 0.25f), contentColor = color),
            modifier = Modifier.size(ButtonDefaults.LargeButtonSize),
        ) {
            Text(glyph, fontSize = 20.sp, fontWeight = FontWeight.Black)
        }
        Text(label, style = MaterialTheme.typography.caption1, modifier = Modifier.padding(top = 4.dp))
    }
}
