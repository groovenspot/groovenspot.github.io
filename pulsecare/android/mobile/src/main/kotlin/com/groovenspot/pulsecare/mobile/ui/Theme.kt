package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.groovenspot.pulsecare.score.Band

/** 기획서·피치 덱과 같은 팔레트. */
object Palette {
    val Navy = Color(0xFF12233A)
    val Teal = Color(0xFF0F7B66)
    val Mint = Color(0xFF7FD1BC)
    val Paper = Color(0xFFF5F6F1)
    val Card = Color(0xFFFDFDFB)
    val Body = Color(0xFF3D4A5C)
    val Muted = Color(0xFF6B7787)
    val Line = Color(0xFFDDE1D9)
    val Coral = Color(0xFFD9653B)
    val Amber = Color(0xFFB7791F)
}

/** 구간 색. 낮은 구간도 빨강 대신 주황 계열로: 빨강은 긴급에만 씁니다 (기획서 12번 문구 가이드). */
val Band.color: Color
    get() = when (this) {
        Band.PEAK, Band.GOOD -> Palette.Teal
        Band.FAIR -> Palette.Amber
        Band.LOW, Band.VERY_LOW -> Palette.Coral
    }

@Composable
fun PulseTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Palette.Teal,
            onPrimary = Palette.Card,
            secondary = Palette.Navy,
            background = Palette.Paper,
            onBackground = Palette.Navy,
            surface = Palette.Paper,
            onSurface = Palette.Navy,
            surfaceContainerLow = Palette.Card,
            surfaceContainer = Palette.Card,
            outlineVariant = Palette.Line,
        ),
        content = content,
    )
}
