package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.groovenspot.pulsecare.score.Band

/**
 * 색. 밝은 회색 바탕에 흰 카드, 진한 글자와 회색 단계로 위계를 두고 강조는 청록 하나만 씁니다
 * (토스·애플 건강처럼 군더더기 없는 화면을 참고). 아이폰 앱과 같은 값입니다.
 */
object Palette {
    val Navy = Color(0xFF191F28)
    val Teal = Color(0xFF0E9F7A)
    val Mint = Color(0xFF7FE3C6)
    val Paper = Color(0xFFF2F4F6)
    val Card = Color(0xFFFFFFFF)
    val Body = Color(0xFF4E5968)
    val Muted = Color(0xFF8B95A1)
    val Line = Color(0xFFE5E8EB)
    val Coral = Color(0xFFF0603A)
    val Amber = Color(0xFFE08A00)
    /** 보조 버튼·칩 바탕. */
    val Fill = Color(0xFFF2F4F6)
    /** 진한 카드(주간 리포트, 호흡) 그라데이션 양 끝. */
    val DeepStart = Color(0xFF14213D)
    val DeepEnd = Color(0xFF0B5A4E)
    val Water = Color(0xFF3B82F6)
    val Pill = Color(0xFF8B5CF6)
}

/** 구간 색. 낮은 구간도 빨강 대신 주황 계열로: 빨강은 긴급에만 씁니다 (기획서 12번 문구 가이드). */
val Band.color: Color
    get() = when (this) {
        Band.PEAK, Band.GOOD -> Palette.Teal
        Band.FAIR -> Palette.Amber
        Band.LOW, Band.VERY_LOW -> Palette.Coral
    }

/** 점수 링 그라데이션 (밝은 쪽 → 구간 색). */
val Band.ringColors: List<Color>
    get() = when (this) {
        Band.PEAK, Band.GOOD -> listOf(Color(0xFF7FE3C6), Palette.Teal)
        Band.FAIR -> listOf(Color(0xFFFFD27A), Palette.Amber)
        Band.LOW, Band.VERY_LOW -> listOf(Color(0xFFFFB199), Palette.Coral)
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

