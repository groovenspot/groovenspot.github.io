package com.groovenspot.cardiopacer.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.wear.compose.material.CompactButton
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Switch
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.ToggleChip
import androidx.wear.compose.material.ToggleChipDefaults
import com.groovenspot.cardiopacer.zone.ZoneProfile
import com.groovenspot.cardiopacer.zone.ZoneRange

/** Onboarding and settings: age + resting heart rate (or a manual range) → Zone 2. */
@Composable
fun SettingsScreen(initial: ZoneProfile, isOnboarding: Boolean, onSave: (ZoneProfile) -> Unit) {
    var age by remember { mutableIntStateOf(initial.age) }
    var manual by remember { mutableStateOf(initial.method == ZoneProfile.Method.MANUAL) }
    var useResting by remember { mutableStateOf(initial.restingHeartRate != null) }
    var resting by remember { mutableIntStateOf(initial.restingHeartRate ?: 60) }
    var lower by remember { mutableIntStateOf(initial.manualRange?.lower ?: 130) }
    var upper by remember { mutableIntStateOf(initial.manualRange?.upper ?: 145) }

    val profile = ZoneProfile(
        age = age,
        restingHeartRate = if (useResting) resting else null,
        maxHeartRateOverride = initial.maxHeartRateOverride,
        method = if (manual) ZoneProfile.Method.MANUAL else ZoneProfile.Method.AUTOMATIC,
        manualRange = ZoneRange.of(lower, upper),
    )
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
                    Text(if (isOnboarding) "존 2 설정" else "설정", style = MaterialTheme.typography.title3)
                    Text(
                        "${profile.zone2Range.label} BPM",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = PacerColors.Green,
                    )
                }
            }
            item {
                ToggleChip(
                    checked = manual,
                    onCheckedChange = { manual = it },
                    label = { Text("직접 입력") },
                    toggleControl = { Switch(checked = manual) },
                    colors = ToggleChipDefaults.toggleChipColors(checkedEndBackgroundColor = PacerColors.Green.copy(alpha = 0.4f)),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (!manual) {
                item { NumberStepper("나이", age, 10..90, "세") { age = it } }
                item {
                    ToggleChip(
                        checked = useResting,
                        onCheckedChange = { useResting = it },
                        label = { Text("안정 시 심박수") },
                        toggleControl = { Switch(checked = useResting) },
                        colors = ToggleChipDefaults.toggleChipColors(checkedEndBackgroundColor = PacerColors.Green.copy(alpha = 0.4f)),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                if (useResting) {
                    item { NumberStepper("안정 시", resting, 35..100, " BPM") { resting = it } }
                }
                item {
                    Text(
                        if (useResting) {
                            "최대 ${profile.estimatedMaxHeartRate} BPM 기준, 여유 심박수의 60~70% (Karvonen)"
                        } else {
                            "최대 심박수 ${profile.estimatedMaxHeartRate} BPM의 60~70%"
                        },
                        style = MaterialTheme.typography.caption3,
                        color = MaterialTheme.colors.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }
            } else {
                item {
                    NumberStepper("하한", lower, 80..200, " BPM") {
                        lower = it
                        if (upper <= lower) upper = lower + 1
                    }
                }
                item { NumberStepper("상한", upper, (lower + 1)..210, " BPM") { upper = it } }
            }
            item {
                Chip(
                    onClick = { onSave(profile) },
                    label = { Text(if (isOnboarding) "시작하기" else "저장", fontWeight = FontWeight.Bold) },
                    colors = ChipDefaults.primaryChipColors(backgroundColor = PacerColors.Green),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Text(
                    "Cardio Pacer는 의료기기가 아니며, 계산된 구간은 일반적인 공식에 따른 참고값입니다. " +
                        "심장 질환이 있거나 약을 복용 중이라면 운동 전 의사와 상담하세요.",
                    style = MaterialTheme.typography.caption3,
                    color = MaterialTheme.colors.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun NumberStepper(label: String, value: Int, range: IntRange, suffix: String, onChange: (Int) -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.caption2, color = MaterialTheme.colors.onSurfaceVariant)
        Row(verticalAlignment = Alignment.CenterVertically) {
            CompactButton(
                onClick = { onChange((value - 1).coerceIn(range)) },
                colors = ButtonDefaults.secondaryButtonColors(),
            ) { Text("−", fontWeight = FontWeight.Bold) }
            Text(
                "$value$suffix",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.width(72.dp),
            )
            CompactButton(
                onClick = { onChange((value + 1).coerceIn(range)) },
                colors = ButtonDefaults.secondaryButtonColors(),
            ) { Text("+", fontWeight = FontWeight.Bold) }
        }
    }
}
