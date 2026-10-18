package com.groovenspot.cardiopacer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
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
import com.groovenspot.cardiopacer.zone.DurationFormatter
import com.groovenspot.cardiopacer.zone.HeartRateZone
import com.groovenspot.cardiopacer.zone.WorkoutSummary

/** Step 3: how much of the workout was spent in Zone 2. */
@Composable
fun SummaryScreen(summary: WorkoutSummary, onDone: () -> Unit) {
    val listState = rememberScalingLazyListState()
    Scaffold(positionIndicator = { PositionIndicator(scalingLazyListState = listState) }) {
        ScalingLazyColumn(
            state = listState,
            modifier = Modifier.fillMaxWidth(),
            autoCentering = null,
            contentPadding = ListPadding,
        ) {
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Zone 2 달성률", style = MaterialTheme.typography.caption1, color = MaterialTheme.colors.onSurfaceVariant)
                    Text(
                        "${summary.zone2Percent}%",
                        fontSize = 44.sp,
                        fontWeight = FontWeight.Black,
                        color = PacerColors.Green,
                    )
                }
            }
            item { ZoneBreakdownBar(summary) }
            item { InfoRow("운동 시간", DurationFormatter.clock(summary.durationMillis)) }
            item { InfoRow("목표 범위", "${summary.range.label} BPM") }
            summary.averageHeartRate?.let { avg ->
                item { InfoRow("평균 심박수", "%.0f BPM".format(avg)) }
            }
            HeartRateZone.entries.forEach { zone ->
                item { InfoRow(zone.title, DurationFormatter.clock(summary.zoneMillis[zone] ?: 0), zone.color) }
            }
            item {
                Chip(
                    onClick = onDone,
                    label = { Text("완료", fontWeight = FontWeight.Bold) },
                    colors = ChipDefaults.primaryChipColors(backgroundColor = PacerColors.Green),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun InfoRow(title: String, value: String, titleColor: Color = MaterialTheme.colors.onSurfaceVariant) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp),
    ) {
        Text(title, color = titleColor, fontSize = 13.sp)
        Text(value, fontSize = 13.sp)
    }
}

/** Proportion of tracked time in blue / green / red. */
@Composable
private fun ZoneBreakdownBar(summary: WorkoutSummary) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(10.dp)
            .clip(RoundedCornerShape(5.dp))
            .background(PacerColors.Waiting),
    ) {
        HeartRateZone.entries.forEach { zone ->
            val fraction = summary.fraction(zone).toFloat()
            if (fraction > 0f) {
                Box(Modifier.weight(fraction).fillMaxHeight().background(zone.color))
            }
        }
    }
}
