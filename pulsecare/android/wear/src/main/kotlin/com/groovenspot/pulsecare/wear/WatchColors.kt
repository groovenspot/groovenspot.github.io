package com.groovenspot.pulsecare.wear

import androidx.compose.ui.graphics.Color
import com.groovenspot.pulsecare.score.Band

/** 워치는 검은 바탕. 폰과 같은 계열의 색을 밝게 씁니다. */
object WatchColors {
    const val WHITE = 0xFFFFFFFF.toInt()
    const val MUTED = 0xFFA9B4C2.toInt()
    const val MINT = 0xFF7FD1BC.toInt()

    val Mint = Color(MINT)
    val Muted = Color(MUTED)
    val Amber = Color(0xFFE0A84A)
    val Coral = Color(0xFFF08A63)
    val Surface = Color(0xFF1C2633)
    /** SOS만 빨강 (기획서 12번: 빨강은 긴급에만). */
    val Emergency = Color(0xFFE5484D)

    fun band(b: Band?): Color = when (b) {
        Band.PEAK, Band.GOOD -> Mint
        Band.FAIR -> Amber
        Band.LOW, Band.VERY_LOW -> Coral
        null -> Muted
    }
}
