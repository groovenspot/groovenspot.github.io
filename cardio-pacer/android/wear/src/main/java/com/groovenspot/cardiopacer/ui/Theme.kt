package com.groovenspot.cardiopacer.ui

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Colors
import androidx.wear.compose.material.MaterialTheme
import com.groovenspot.cardiopacer.zone.HeartRateZone

object PacerColors {
    val Blue = Color(0xFF1F73F2)
    val Green = Color(0xFF1CB354)
    val Red = Color(0xFFE62E2E)
    val Yellow = Color(0xFFF2C21F)

    /** Shown before the first heart rate reading arrives. */
    val Waiting = Color(0xFF383838)
}

val HeartRateZone.color: Color
    get() = when (this) {
        HeartRateZone.BELOW -> PacerColors.Blue
        HeartRateZone.TARGET -> PacerColors.Green
        HeartRateZone.ABOVE -> PacerColors.Red
    }

val HeartRateZone.title: String
    get() = when (this) {
        HeartRateZone.BELOW -> "ZONE 1"
        HeartRateZone.TARGET -> "ZONE 2"
        HeartRateZone.ABOVE -> "ZONE 3+"
    }

val HeartRateZone.message: String
    get() = when (this) {
        HeartRateZone.BELOW -> "페이스를 조금 올리세요"
        HeartRateZone.TARGET -> "완벽합니다! 이대로 유지"
        HeartRateZone.ABOVE -> "속도를 줄이세요"
    }

/** Keeps list content clear of the round screen's edges. */
val ListPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 32.dp, bottom = 40.dp)

@Composable
fun CardioPacerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colors = Colors(primary = PacerColors.Green, onPrimary = Color.Black, secondary = PacerColors.Green),
        content = content,
    )
}
