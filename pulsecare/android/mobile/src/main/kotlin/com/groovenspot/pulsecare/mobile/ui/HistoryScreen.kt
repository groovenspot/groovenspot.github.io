package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.history.History
import com.groovenspot.pulsecare.history.HistoryDay
import com.groovenspot.pulsecare.history.Period
import com.groovenspot.pulsecare.history.UsualRange
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.score.Metric
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

enum class Tab(val label: String) { TODAY("오늘"), HISTORY("기록"), FAMILY("가족") }

/** 오늘·기록·가족 아래 탭. */
@Composable
fun MainTabs(current: Tab, onTab: (Tab) -> Unit, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxSize().background(Palette.Paper)) {
        Box(Modifier.weight(1f).consumeWindowInsets(WindowInsets.navigationBars)) { content() }
        NavigationBar(containerColor = Palette.Card, tonalElevation = 0.dp) {
            Tab.entries.forEach { tab ->
                NavigationBarItem(
                    selected = tab == current,
                    onClick = { onTab(tab) },
                    icon = { Box(Modifier.size(8.dp).clip(CircleShape).background(if (tab == current) Palette.Teal else Palette.Line)) },
                    label = { Text(tab.label, fontSize = 14.sp, fontWeight = if (tab == current) FontWeight.Bold else FontWeight.Normal) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedTextColor = Palette.Teal,
                        unselectedTextColor = Palette.Muted,
                        indicatorColor = Palette.Paper,
                    ),
                )
            }
        }
    }
}

/**
 * 기록 탭 (기획서 16번): 주간·월간 점수, 수면, 회복 추이와 미션 달력. 날짜를 누르면 그날 내용을 아래에 보여줍니다.
 * 상태만 받아 그리므로 스크린샷 테스트에서도 그대로 씁니다.
 */
@Composable
fun HistoryContent(
    history: History?,
    period: Period,
    onPeriod: (Period) -> Unit,
    selected: LocalDate?,
    onSelect: (LocalDate) -> Unit,
    onOpenSettings: () -> Unit = {},
    /** 진료용 요약 PDF 만들기. */
    onExport: () -> Unit = {},
) {
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
            Text("기록", color = Palette.Navy, fontSize = 26.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            TextButton(onClick = onOpenSettings) { Text("내 정보", color = Palette.Teal, fontWeight = FontWeight.SemiBold) }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { PeriodToggle(period, onPeriod) }
            OutlinedButton(onClick = onExport) { Text("진료용 요약 PDF", color = Palette.Navy, fontSize = 13.sp) }
        }
        if (history == null) {
            Text("기록을 불러오는 중이에요", color = Palette.Muted)
            return@Column
        }
        val days = history.days
        val selectedIndex = days.indexOfFirst { it.date == selected }.takeIf { it >= 0 }
        val select: (Int) -> Unit = { i -> days.getOrNull(i)?.let { onSelect(it.date) } }

        Panel {
            history.lines.forEach { Text(it, color = Palette.Body, fontSize = 15.sp, lineHeight = 22.sp) }
            if (days.all { it.dayIndex < 1 || it.learning }) {
                Text("첫 7일은 내 평소를 배우는 중이라 점수가 흔들릴 수 있어요.", color = Palette.Muted, fontSize = 13.sp)
            }
        }

        Panel {
            ChartTitle("컨디션 점수", history.averageScore?.let { "평균 ${it}점" })
            Chart(
                values = days.map { it.score?.toDouble() },
                yMin = 0.0,
                yMax = 100.0,
                bars = true,
                selected = selectedIndex,
                onTap = select,
                color = { i ->
                    val d = days[i]
                    val c = d.band?.color ?: Palette.Line
                    if (d.learning || d.estimated) c.copy(alpha = 0.4f) else c
                },
            )
            DateAxis(days, history.period)
            Legend(listOf(Palette.Teal to "좋음 이상", Palette.Amber to "보통", Palette.Coral to "낮음", Palette.Teal.copy(alpha = 0.4f) to "학습 중·추정"))
        }

        Panel {
            ChartTitle("수면 시간", history.averageSleepMinutes?.let { "평균 ${History.duration(it)}" })
            Chart(
                values = days.map { it.sleepMinutes?.toDouble() },
                yMin = 0.0,
                yMax = max(600.0, (days.mapNotNull { it.sleepMinutes }.maxOrNull() ?: 0) + 30.0),
                bars = true,
                range = history.sleep,
                selected = selectedIndex,
                onTap = select,
                color = { i -> if (history.sleep?.let { r -> days[i].sleepMinutes?.let { it < r.low } } == true) Palette.Amber else Palette.Navy },
            )
            DateAxis(days, history.period)
            RangeNote(history.sleep) { "${History.duration(it.low.roundToInt())} ~ ${History.duration(it.high.roundToInt())}" }
            history.usualBedtime?.let { Text("평소 취침 ${History.clock(it)}", color = Palette.Muted, fontSize = 13.sp) }
        }

        Panel {
            ChartTitle("회복 · HRV", history.hrv?.let { "평소 ${it.mid.roundToInt()}ms" })
            LineChart(days.map { it.hrvMs }, history.hrv, selectedIndex, select)
            DateAxis(days, history.period)
            RangeNote(history.hrv) { "${it.low.roundToInt()} ~ ${it.high.roundToInt()}ms · 높을수록 잘 회복" }
            Spacer(Modifier.height(4.dp))
            ChartTitle("안정시 심박", history.restingHr?.let { "평소 ${it.mid.roundToInt()}bpm" })
            LineChart(days.map { it.restingHr }, history.restingHr, selectedIndex, select)
            DateAxis(days, history.period)
            RangeNote(history.restingHr) { "${it.low.roundToInt()} ~ ${it.high.roundToInt()}bpm · 낮을수록 잘 회복" }
        }

        Panel {
            ChartTitle("미션", "${history.missionsDone}일 완료")
            MissionCalendar(history, selected, onSelect)
            Legend(listOf(Palette.Teal to "직접 완료", Palette.Mint to "워치로 확인", Palette.Line to "못 한 날"))
        }

        days.firstOrNull { it.date == selected }?.let { DayDetail(it) }
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun PeriodToggle(period: Period, onPeriod: (Period) -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(12.dp)).background(Palette.Line.copy(alpha = 0.6f)).padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Period.entries.forEach { p ->
            val on = p == period
            Text(
                p.label,
                color = if (on) Palette.Navy else Palette.Muted,
                fontWeight = if (on) FontWeight.Bold else FontWeight.Normal,
                fontSize = 14.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(9.dp))
                    .background(if (on) Palette.Card else Color.Transparent)
                    .clickable { onPeriod(p) }
                    .padding(horizontal = 18.dp, vertical = 8.dp),
            )
        }
    }
}

@Composable
private fun Panel(content: @Composable () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Palette.Card),
        border = BorderStroke(1.dp, Palette.Line),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(18.dp)) { content() }
    }
}

@Composable
private fun ChartTitle(title: String, value: String?) {
    Row(verticalAlignment = Alignment.Bottom) {
        Text(title, color = Palette.Navy, fontSize = 17.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        value?.let { Text(it, color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.SemiBold) }
    }
}

@Composable
private fun RangeNote(range: UsualRange?, text: (UsualRange) -> String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(width = 14.dp, height = 8.dp).clip(RoundedCornerShape(2.dp)).background(Palette.Mint.copy(alpha = 0.35f)))
        Text(
            range?.let { "내 평소 범위 " + text(it) } ?: "평소 범위는 기록이 7일 쌓이면 보여요",
            color = Palette.Muted,
            fontSize = 12.sp,
        )
    }
}

@Composable
private fun Legend(items: List<Pair<Color, String>>) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        items.forEach { (c, label) ->
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).clip(CircleShape).background(c))
                Text(label, color = Palette.Muted, fontSize = 11.sp)
            }
        }
    }
}

/** 막대 또는 선. [range]는 평소 범위 띠, 값이 없는 날은 비워 둡니다. 막대를 누르면 그날을 고릅니다. */
@Composable
private fun Chart(
    values: List<Double?>,
    yMin: Double,
    yMax: Double,
    bars: Boolean,
    selected: Int?,
    onTap: (Int) -> Unit,
    color: (Int) -> Color,
    range: UsualRange? = null,
) {
    val n = values.size
    Canvas(
        Modifier
            .fillMaxWidth()
            .height(120.dp)
            .pointerInput(n) { detectTapGestures { onTap((it.x / (size.width.toFloat() / n)).toInt().coerceIn(0, n - 1)) } },
    ) {
        val slot = size.width / n
        fun y(v: Double) = (size.height * (1 - ((v - yMin) / (yMax - yMin)).coerceIn(0.0, 1.0))).toFloat()

        range?.let { r ->
            val top = y(r.high)
            drawRect(Palette.Mint.copy(alpha = 0.25f), Offset(0f, top), Size(size.width, y(r.low) - top))
        }
        drawLine(Palette.Line, Offset(0f, size.height), Offset(size.width, size.height), strokeWidth = 1.dp.toPx())
        selected?.let { i ->
            drawRoundRect(Palette.Navy.copy(alpha = 0.06f), Offset(i * slot, 0f), Size(slot, size.height), CornerRadius(4.dp.toPx()))
        }

        if (bars) {
            val w = min(slot * 0.62f, 22.dp.toPx())
            values.forEachIndexed { i, v ->
                val x = i * slot + (slot - w) / 2
                if (v == null) {
                    drawCircle(Palette.Line, radius = 2.dp.toPx(), center = Offset(i * slot + slot / 2, size.height - 4.dp.toPx()))
                } else {
                    val top = y(v)
                    drawRoundRect(color(i), Offset(x, top), Size(w, size.height - top), CornerRadius(min(w / 2, 4.dp.toPx())))
                }
            }
        } else {
            val path = Path()
            var started = false
            values.forEachIndexed { i, v ->
                if (v == null) {
                    started = false
                    return@forEachIndexed
                }
                val p = Offset(i * slot + slot / 2, y(v))
                if (started) path.lineTo(p.x, p.y) else path.moveTo(p.x, p.y)
                started = true
            }
            drawPath(path, Palette.Navy, style = Stroke(width = 2.dp.toPx()))
            values.forEachIndexed { i, v ->
                v ?: return@forEachIndexed
                val c = Offset(i * slot + slot / 2, y(v))
                drawCircle(color(i), radius = (if (i == selected) 5 else 3).dp.toPx(), center = c)
            }
        }
    }
}

@Composable
private fun LineChart(values: List<Double?>, range: UsualRange?, selected: Int?, onTap: (Int) -> Unit) {
    val known = values.filterNotNull() + listOfNotNull(range?.low, range?.high)
    if (known.isEmpty()) {
        Text("기록이 없어요", color = Palette.Muted, fontSize = 13.sp)
        return
    }
    val lo = known.min()
    val hi = known.max()
    val pad = max((hi - lo) * 0.15, 1.0)
    Chart(
        values = values,
        yMin = lo - pad,
        yMax = hi + pad,
        bars = false,
        selected = selected,
        onTap = onTap,
        range = range,
        color = { i -> if (range != null && values[i]?.let { it !in range } == true) Palette.Amber else Palette.Navy },
    )
}

@Composable
private fun DateAxis(days: List<HistoryDay>, period: Period) {
    if (period == Period.WEEK) {
        Row(Modifier.fillMaxWidth()) {
            days.forEach {
                Text(
                    it.date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.KOREAN),
                    color = Palette.Muted,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    } else {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            listOf(0, days.size / 2, days.size - 1).forEach { i ->
                days.getOrNull(i)?.let { Text("${it.date.monthValue}/${it.date.dayOfMonth}", color = Palette.Muted, fontSize = 11.sp) }
            }
        }
    }
}

/**
 * 진료용 요약 만들기: 기간과 (선택) 이름. 만드는 동안은 [busy].
 * 수치가 담긴 파일이라 받는 사람을 고르는 건 사용자 몫이고, 서버로는 보내지 않는다고 알려 줍니다.
 */
@Composable
fun ExportDialog(busy: Boolean, error: String?, onDismiss: () -> Unit, onCreate: (days: Int, name: String) -> Unit) {
    var days by remember { mutableIntStateOf(30) }
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("진료용 건강 요약") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "수면·심박·HRV·걸음 기록을 A4 두 장으로 정리해요. 이 휴대폰에서 만들고, 고른 곳으로만 보내요.",
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(30, 90).forEach { d ->
                        val on = d == days
                        Text(
                            "최근 ${d}일",
                            color = if (on) Palette.Card else Palette.Navy,
                            fontSize = 14.sp,
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (on) Palette.Teal else Palette.Line.copy(alpha = 0.6f))
                                .clickable { days = d }
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                        )
                    }
                }
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it.take(20) },
                    label = { Text("이름 (선택, PDF에 표시)") },
                    singleLine = true,
                )
                error?.let { Text(it, color = Palette.Coral, fontSize = 13.sp) }
            }
        },
        confirmButton = {
            TextButton(onClick = { onCreate(days, name.trim()) }, enabled = !busy) { Text(if (busy) "만드는 중…" else "PDF 만들고 보내기") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { Text("취소") } },
    )
}

/** 월요일부터 한 줄에 한 주. 주 5일 이상 완료한 주에는 배지. */
@Composable
private fun MissionCalendar(history: History, selected: LocalDate?, onSelect: (LocalDate) -> Unit) {
    val byDate = history.days.associateBy { it.date }
    val first = history.days.first().date
    val last = history.days.last().date
    val start = first.minusDays((first.dayOfWeek.value - 1).toLong())
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(Modifier.fillMaxWidth()) {
            DayOfWeek.entries.forEach {
                Text(it.getDisplayName(TextStyle.NARROW, Locale.KOREAN), color = Palette.Muted, fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
            }
            Spacer(Modifier.width(36.dp))
        }
        generateSequence(start) { it.plusWeeks(1) }.takeWhile { it <= last }.forEach { monday ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                (0L..6L).map { monday.plusDays(it) }.forEach { date ->
                    Box(Modifier.weight(1f).aspectRatio(1f).padding(3.dp), contentAlignment = Alignment.Center) {
                        byDate[date]?.let { MissionCell(it, it.date == selected) { onSelect(date) } }
                    }
                }
                Box(Modifier.width(36.dp), contentAlignment = Alignment.Center) {
                    if (monday.plusDays(6) in history.weeklyBadges) {
                        Text("배지", color = Palette.Teal, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun MissionCell(day: HistoryDay, selected: Boolean, onClick: () -> Unit) {
    val m = day.mission
    val fill = when {
        m == null -> Color.Transparent
        m.completed && m.auto -> Palette.Mint
        m.completed -> Palette.Teal
        else -> Palette.Line
    }
    Box(
        Modifier
            .fillMaxSize()
            .clip(CircleShape)
            .background(fill)
            .then(if (selected) Modifier.border(2.dp, Palette.Navy, CircleShape) else Modifier)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            "${day.date.dayOfMonth}",
            color = if (m?.completed == true && !m.auto) Palette.Card else Palette.Body,
            fontSize = 12.sp,
        )
    }
}

private val METRIC_NAMES = mapOf(
    Metric.SLEEP_DURATION to "수면 시간",
    Metric.SLEEP_QUALITY to "수면 질",
    Metric.REGULARITY to "규칙성",
    Metric.HRV to "HRV",
    Metric.RESTING_HR to "안정시 심박",
    Metric.ACTIVITY_LOAD to "활동 부하",
    Metric.SKIN_TEMP to "피부 온도",
    Metric.RESPIRATORY_RATE to "호흡수",
)

@Composable
private fun DayDetail(day: HistoryDay) {
    Panel {
        val d = day.date
        Text(
            "${d.monthValue}월 ${d.dayOfMonth}일 ${d.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.KOREAN)}",
            color = Palette.Muted,
            fontSize = 13.sp,
        )
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(day.score?.toString() ?: "-", color = Palette.Navy, fontSize = 36.sp, fontWeight = FontWeight.Bold)
            day.band?.let { Text(it.label, color = it.color, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 6.dp)) }
            val tags = listOfNotNull(if (day.learning) "학습 중" else null, if (day.estimated) "추정" else null)
            if (tags.isNotEmpty()) Text(tags.joinToString(" · "), color = Palette.Muted, fontSize = 13.sp, modifier = Modifier.padding(bottom = 8.dp))
        }
        Text(
            day.reason ?: if (day.dayIndex < 1) "가입 전이라 점수는 없어요" else "이날은 밤 기록이 없어요",
            color = Palette.Body,
            fontSize = 15.sp,
            lineHeight = 21.sp,
        )
        Fact("수면", day.sleepMinutes?.let { History.duration(it) + (day.bedtime?.let { b -> " · ${History.clock(b)} 취침" } ?: "") })
        Fact("HRV", day.hrvMs?.let { "${it.roundToInt()}ms" })
        Fact("안정시 심박", day.restingHr?.let { "${it.roundToInt()}bpm" })
        day.mission?.let { m ->
            val status = when {
                m.completed && m.auto -> "완료 (워치로 확인)"
                m.completed -> "완료"
                else -> "못 했어요"
            }
            Fact("미션", "${MissionLibrary[m.missionId].title} · $status")
        }
        if (day.subScores.isNotEmpty()) {
            Text("세부 점수", color = Palette.Teal, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            day.subScores.entries.sortedBy { it.value }.forEach { (metric, v) -> SubScoreBar(METRIC_NAMES.getValue(metric), v) }
        }
    }
}

@Composable
private fun Fact(label: String, value: String?) {
    Row {
        Text(label, color = Palette.Muted, fontSize = 14.sp, modifier = Modifier.width(88.dp))
        Text(value ?: "기록 없음", color = if (value == null) Palette.Muted else Palette.Navy, fontSize = 14.sp)
    }
}

@Composable
private fun SubScoreBar(label: String, value: Double) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, color = Palette.Body, fontSize = 13.sp, modifier = Modifier.width(80.dp))
        Box(Modifier.weight(1f).height(8.dp).clip(RoundedCornerShape(4.dp)).background(Palette.Line)) {
            Box(
                Modifier
                    .fillMaxWidth((value / 100).toFloat().coerceIn(0f, 1f))
                    .height(8.dp)
                    .background(if (value >= 70) Palette.Teal else if (value >= 50) Palette.Amber else Palette.Coral),
            )
        }
        Text("${value.roundToInt()}", color = Palette.Navy, fontSize = 13.sp, modifier = Modifier.width(28.dp), textAlign = TextAlign.End)
    }
}
