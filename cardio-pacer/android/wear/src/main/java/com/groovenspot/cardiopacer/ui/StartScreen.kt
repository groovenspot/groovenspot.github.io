package com.groovenspot.cardiopacer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import com.groovenspot.cardiopacer.exercise.WorkoutActivity
import com.groovenspot.cardiopacer.zone.ZoneRange

/** Step 1: confirm the Zone 2 target, pick an activity, and start. */
@Composable
fun StartScreen(
    range: ZoneRange,
    initialActivity: WorkoutActivity,
    error: String?,
    onStart: (WorkoutActivity) -> Unit,
    onOpenSettings: () -> Unit,
) {
    var activity by remember { mutableStateOf(initialActivity) }
    val listState = rememberScalingLazyListState()

    Scaffold(
        timeText = { TimeText() },
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) },
    ) {
        ScalingLazyColumn(
            state = listState,
            modifier = Modifier.fillMaxWidth(),
            autoCentering = null,
            contentPadding = ListPadding,
        ) {
            item {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(PacerColors.Green.copy(alpha = 0.15f), RoundedCornerShape(16.dp))
                        .padding(vertical = 8.dp),
                ) {
                    Text("목표 ZONE 2", style = MaterialTheme.typography.caption2, color = MaterialTheme.colors.onSurfaceVariant)
                    Text(
                        range.label,
                        fontSize = 30.sp,
                        fontWeight = FontWeight.Black,
                        color = PacerColors.Green,
                    )
                    Text("BPM", style = MaterialTheme.typography.caption2, color = MaterialTheme.colors.onSurfaceVariant)
                }
            }
            item {
                Chip(
                    onClick = {
                        val all = WorkoutActivity.entries
                        activity = all[(all.indexOf(activity) + 1) % all.size]
                    },
                    label = { Text("운동 종류") },
                    secondaryLabel = { Text(activity.title, color = PacerColors.Green) },
                    colors = ChipDefaults.secondaryChipColors(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Chip(
                    onClick = { onStart(activity) },
                    label = { Text("시작", fontWeight = FontWeight.Bold) },
                    colors = ChipDefaults.primaryChipColors(backgroundColor = PacerColors.Green),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (error != null) {
                item {
                    Text(error, color = PacerColors.Red, style = MaterialTheme.typography.caption2, textAlign = TextAlign.Center)
                }
            }
            item {
                Chip(
                    onClick = onOpenSettings,
                    label = { Text("존 설정") },
                    colors = ChipDefaults.secondaryChipColors(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}
