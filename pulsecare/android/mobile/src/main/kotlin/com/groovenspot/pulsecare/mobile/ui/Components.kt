package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.score.Band

/** 점수 링 (구간 색 그라데이션, 0~100). 처음 보일 때 점수까지 차오릅니다. 아이폰 앱과 같은 모양입니다. */
@Composable
fun ScoreRing(
    score: Int?,
    band: Band?,
    modifier: Modifier = Modifier,
    size: Dp = 132.dp,
    stroke: Dp = 12.dp,
    caption: String? = null,
) {
    val target = (score ?: 0) / 100f
    val progress = remember { Animatable(target) }
    LaunchedEffect(target) { progress.animateTo(target, tween(600)) }
    val colors = band?.ringColors ?: listOf(Palette.Line, Palette.Muted)
    Box(contentAlignment = Alignment.Center, modifier = modifier.size(size)) {
        Canvas(Modifier.matchParentSize()) {
            val w = stroke.toPx()
            val topLeft = Offset(w / 2, w / 2)
            val arc = Size(this.size.width - w, this.size.height - w)
            drawArc(Palette.Line, -90f, 360f, false, topLeft, arc, style = Stroke(w))
            rotate(-90f) {
                drawArc(
                    brush = Brush.sweepGradient(colors),
                    startAngle = 0f,
                    sweepAngle = 360f * progress.value,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arc,
                    style = Stroke(w, cap = StrokeCap.Round),
                )
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(score?.toString() ?: "-", color = Palette.Navy, fontSize = (size.value * 0.36f).sp, fontWeight = FontWeight.Bold)
            caption?.let { Text(it, color = Palette.Muted, fontSize = 12.sp) }
        }
    }
}
