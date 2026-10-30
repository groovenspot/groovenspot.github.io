package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.care.Breathing
import com.groovenspot.pulsecare.care.DayTags
import com.groovenspot.pulsecare.care.Dose
import com.groovenspot.pulsecare.care.Medication
import com.groovenspot.pulsecare.mission.MissionVerifier
import com.groovenspot.pulsecare.score.DayTag
import kotlinx.coroutines.delay
import java.time.LocalTime
import java.util.UUID
import kotlin.math.roundToInt

// --- 1분 호흡 ---

/**
 * 1분 호흡 가이드 (미션 R-01·C-04·S-04·R-08, 스트레스 알림의 "호흡 시작"). 원이 커지면 들이쉬고 작아지면 내쉽니다.
 * 끝까지 하면 [onComplete]로 기록해 미션 자동 확인에 씁니다.
 */
@Composable
fun BreathingScreen(todayCount: Int, onComplete: () -> Unit, onClose: () -> Unit) {
    var running by remember { mutableStateOf(false) }
    var elapsed by remember { mutableDoubleStateOf(0.0) }
    var finished by remember { mutableStateOf(false) }
    LaunchedEffect(running) {
        if (!running) return@LaunchedEffect
        val start = System.nanoTime()
        while (elapsed < Breathing.TOTAL_SECONDS) {
            delay(50)
            elapsed = (System.nanoTime() - start) / 1e9
        }
        running = false
        finished = true
        onComplete()
    }
    BreathingContent(
        elapsed = elapsed,
        running = running,
        finished = finished,
        todayCount = todayCount + if (finished) 1 else 0,
        onStart = {
            elapsed = 0.0
            finished = false
            running = true
        },
        onClose = onClose,
    )
}

/** 상태만 받아 그리는 호흡 화면 (스크린샷 테스트용). */
@Composable
fun BreathingContent(elapsed: Double, running: Boolean, finished: Boolean, todayCount: Int, onStart: () -> Unit, onClose: () -> Unit) {
    val (phase, progress) = Breathing.at(elapsed)
    // 들이쉴 때 0.55 → 1.0, 내쉴 때 1.0 → 0.55
    val target = when {
        !running -> 0.6f
        phase == Breathing.Phase.INHALE -> 0.55f + 0.45f * progress.toFloat()
        phase == Breathing.Phase.EXHALE -> 1f - 0.45f * progress.toFloat()
        else -> 0.6f
    }
    val scale by animateFloatAsState(target, animationSpec = tween(80), label = "breath")
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(18.dp),
        modifier = Modifier.fillMaxSize().background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Palette.DeepStart, Palette.DeepEnd))).safeDrawingPadding().padding(24.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Text("1분 호흡", color = Palette.Paper, fontSize = 24.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            TextButton(onClick = onClose) { Text("닫기", color = Palette.Mint) }
        }
        Text(
            "4초 들이쉬고 6초 내쉬기, 6번. 내쉬는 숨을 길게 하면 몸이 쉬는 쪽으로 바뀌어요.",
            color = Palette.Line,
            fontSize = 15.sp,
            lineHeight = 22.sp,
        )
        Spacer(Modifier.weight(1f))
        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(280.dp)) {
            Box(Modifier.size(280.dp).scale(scale).clip(CircleShape).background(Palette.Mint.copy(alpha = 0.35f)))
            Box(Modifier.size(200.dp).scale(scale).clip(CircleShape).background(Palette.Mint.copy(alpha = 0.6f)))
            Text(
                when {
                    finished -> Breathing.Phase.DONE.label
                    running -> phase.label
                    else -> "준비되면 시작"
                },
                color = Palette.Navy,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
            )
        }
        if (running) {
            val left = (Breathing.TOTAL_SECONDS - elapsed).coerceAtLeast(0.0).roundToInt()
            Text("${left}초 남았어요", color = Palette.Line, fontSize = 16.sp)
        }
        Spacer(Modifier.weight(1f))
        if (finished) Text("오늘 호흡 ${todayCount}번 했어요", color = Palette.Mint, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        if (!running) {
            Button(
                onClick = onStart,
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Mint),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth().height(56.dp),
            ) { Text(if (finished) "한 번 더" else "시작하기", color = Palette.Navy, fontSize = 18.sp, fontWeight = FontWeight.Bold) }
        }
    }
}

// --- 홈 카드 ---

@Composable
private fun CareCard(content: @Composable () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Palette.Card),
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth(),
    ) { Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(20.dp)) { content() } }
}

/**
 * 아침 몸 상태 체크 (미션 C-08). 음주·야근·아픔을 남기면 오늘 점수 이유에 반영되고 기준선에서는 빠져
 * 하루 튄 값 때문에 내 평소가 흔들리지 않습니다. [saved]가 null이면 아직 안 남긴 날.
 */
@Composable
fun TagCard(saved: Set<DayTag>?, onSave: (Set<DayTag>) -> Unit) {
    var picked by remember(saved) { mutableStateOf(saved ?: emptySet()) }
    var editing by remember(saved) { mutableStateOf(saved == null) }
    CareCard {
        if (!editing) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (saved.isNullOrEmpty()) "어제는 특별한 일 없었어요" else "어제: " + saved.joinToString(" · ") { DayTags.label(it) },
                    color = Palette.Body,
                    fontSize = 14.sp,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = { editing = true }) { Text("고치기", color = Palette.Teal, fontSize = 13.sp) }
            }
            return@CareCard
        }
        Text("어제는 어땠나요?", color = Palette.Navy, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text("남겨 두면 오늘 점수에 반영하고, 내 평소 기준에서는 빼요", color = Palette.Muted, fontSize = 13.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(DayTag.ALCOHOL, DayTag.OVERTIME, DayTag.SICK).forEach { tag ->
                val on = tag in picked
                Text(
                    DayTags.label(tag),
                    color = if (on) Palette.Paper else Palette.Navy,
                    fontSize = 13.sp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(if (on) Palette.Teal else Palette.Paper)
                        .clickable { picked = if (on) picked - tag else picked + tag }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = {
                    onSave(picked)
                    editing = false
                },
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                shape = RoundedCornerShape(14.dp),
            ) { Text(if (picked.isEmpty()) "특별한 일 없었어요" else "남기기") }
        }
    }
}

/** 물 6잔 (미션 C-07). 잔을 누를 때마다 하나씩. */
@Composable
fun WaterCard(cups: Int, onChange: (Int) -> Unit) {
    CareCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("물 ${cups}/${MissionVerifier.WATER_CUPS}잔", color = Palette.Navy, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            if (cups > 0) TextButton(onClick = { onChange(cups - 1) }) { Text("하나 빼기", color = Palette.Muted, fontSize = 13.sp) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            repeat(MissionVerifier.WATER_CUPS) { i ->
                Box(
                    Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (i < cups) Palette.Teal else Palette.Paper)
                        .clickable { onChange(if (i < cups) i else i + 1) },
                )
            }
        }
        OutlinedButton(onClick = { onChange(cups + 1) }, border = BorderStroke(1.dp, Palette.Line)) { Text("한 잔 마셨어요", color = Palette.Navy) }
    }
}

/** 오늘 먹을 약. 지난 시각인데 체크가 없으면 주황색, 3시간 넘으면 "놓쳤어요". */
@Composable
fun MedicationCard(doses: List<Dose>, now: LocalTime, onTaken: (Dose) -> Unit, onManage: () -> Unit) {
    CareCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("오늘 먹을 약", color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            TextButton(onClick = onManage) { Text("관리", color = Palette.Muted, fontSize = 13.sp) }
        }
        doses.forEach { d ->
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.weight(1f)) {
                    Text("${timeLabel(d.time)} · ${d.medication.name}", color = Palette.Navy, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    val note = when {
                        d.taken -> "먹었어요"
                        d.missed -> "3시간째 체크가 없어요"
                        !d.time.isAfter(now) -> "먹을 시간이에요"
                        else -> null
                    }
                    note?.let {
                        Text(it, color = if (d.taken) Palette.Teal else if (d.missed) Palette.Coral else Palette.Amber, fontSize = 13.sp)
                    }
                }
                if (!d.taken) {
                    Button(
                        onClick = { onTaken(d) },
                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                        shape = RoundedCornerShape(14.dp),
                    ) { Text("먹었어요") }
                }
            }
        }
    }
}

// --- 약 관리 ---

/** 약 이름과 하루 복용 시각. 이름은 이 휴대폰에만 남고 보호자에게는 "약 체크 없음"만 갑니다. */
@Composable
fun MedicationsScreen(medications: List<Medication>, onSave: (List<Medication>) -> Unit, onBack: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var times by remember { mutableStateOf(listOf(LocalTime.of(8, 0))) }
    var editingTime by remember { mutableStateOf<Int?>(null) }
    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier
            .fillMaxSize()
            .background(Palette.Paper)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("약 알림", color = Palette.Navy, fontSize = 28.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            TextButton(onClick = onBack) { Text("닫기", color = Palette.Teal) }
        }
        Text(
            "시간마다 알리고 \"먹었어요\"로 체크해요. 3시간이 지나도 체크가 없으면 한 번 더 묻고, 가족이 연결돼 있으면 보호자 하루 요약에 \"약 체크 없음\"이 실려요. 약 이름은 이 휴대폰에만 남아요.",
            color = Palette.Body,
            fontSize = 14.sp,
            lineHeight = 20.sp,
        )
        medications.forEach { m ->
            CareCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(m.name, color = Palette.Navy, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                        Text(m.times.sorted().joinToString(", ") { timeLabel(it) }, color = Palette.Muted, fontSize = 13.sp)
                    }
                    TextButton(onClick = { onSave(medications - m) }) { Text("지우기", color = Palette.Coral) }
                }
            }
        }
        CareCard {
            Text("약 추가", color = Palette.Navy, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            OutlinedTextField(value = name, onValueChange = { name = it.take(20) }, label = { Text("약 이름 (예: 혈압약)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            times.forEachIndexed { i, t ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(timeLabel(t), color = Palette.Teal, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f).clickable { editingTime = i })
                    if (times.size > 1) TextButton(onClick = { times = times.filterIndexed { j, _ -> j != i } }) { Text("빼기", color = Palette.Muted) }
                }
            }
            if (times.size < 4) {
                TextButton(onClick = { times = times + (times.maxOrNull()?.plusHours(5)?.takeIf { it.hour >= 6 } ?: LocalTime.of(20, 0)) }) {
                    Text("시각 더하기", color = Palette.Teal)
                }
            }
            Button(
                onClick = {
                    onSave(medications + Medication(UUID.randomUUID().toString().take(8), name.trim(), times.distinct().sorted()))
                    name = ""
                    times = listOf(LocalTime.of(8, 0))
                },
                enabled = name.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                shape = RoundedCornerShape(14.dp),
            ) { Text("추가하기") }
        }
        Spacer(Modifier.height(8.dp))
    }
    editingTime?.let { i ->
        TimeDialog(times[i], onDismiss = { editingTime = null }) { t ->
            times = times.mapIndexed { j, old -> if (j == i) t else old }
            editingTime = null
        }
    }
}
