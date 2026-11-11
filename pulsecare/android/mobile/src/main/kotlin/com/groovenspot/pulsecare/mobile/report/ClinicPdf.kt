package com.groovenspot.pulsecare.mobile.report

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import com.groovenspot.pulsecare.report.ClinicReport
import com.groovenspot.pulsecare.report.ClinicSummary
import com.groovenspot.pulsecare.report.Stat
import java.io.File
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

/** PDF에 같이 찍을 것. 이름은 사용자가 적은 경우만. */
data class ClinicMeta(val name: String?, val createdOn: LocalDate, val sources: List<String>)

/**
 * 진료용 건강 요약 PDF (A4 두 장). 휴대폰 안에서 그리고 서버로 보내지 않습니다.
 * 의사가 읽기 쉽게 원래 단위(시간, bpm, ms, 걸음)를 먼저, 앱 점수는 맨 아래 참고로만 둡니다.
 */
object ClinicPdf {
    const val WIDTH = 595
    const val HEIGHT = 842
    const val PAGES = 2
    private const val MARGIN = 40f

    private val NAVY = Color.rgb(0x12, 0x23, 0x3A)
    private val BODY = Color.rgb(0x3D, 0x4A, 0x5C)
    private val MUTED = Color.rgb(0x6B, 0x77, 0x87)
    private val LINE = Color.rgb(0xDD, 0xE1, 0xD9)
    private val TEAL = Color.rgb(0x0F, 0x7B, 0x66)
    private val AMBER = Color.rgb(0xB7, 0x79, 0x1F)
    private val BAND = Color.argb(60, 0x7F, 0xD1, 0xBC)

    private val DATE = DateTimeFormatter.ofPattern("yyyy.MM.dd")
    private val SHORT = DateTimeFormatter.ofPattern("M/d")

    fun write(file: File, s: ClinicSummary, meta: ClinicMeta) {
        val doc = PdfDocument()
        try {
            repeat(PAGES) { i ->
                val page = doc.startPage(PdfDocument.PageInfo.Builder(WIDTH, HEIGHT, i + 1).create())
                drawPage(page.canvas, i, s, meta)
                doc.finishPage(page)
            }
            file.parentFile?.mkdirs()
            file.outputStream().use { doc.writeTo(it) }
        } finally {
            doc.close()
        }
    }

    fun drawPage(c: Canvas, index: Int, s: ClinicSummary, meta: ClinicMeta) {
        c.drawColor(Color.WHITE)
        if (index == 0) first(c, s, meta) else second(c, s)
        footer(c, index)
    }

    private fun first(c: Canvas, s: ClinicSummary, meta: ClinicMeta) {
        var y = 56f
        text(c, "건강 요약 · 웨어러블 측정 기록", MARGIN, y, 20f, NAVY, bold = true)
        y += 22f
        val who = meta.name?.takeIf { it.isNotBlank() }?.let { "$it · " } ?: ""
        text(c, "${who}기간 ${s.from.format(DATE)} – ${s.to.format(DATE)} (${s.days}일) · 작성 ${meta.createdOn.format(DATE)}", MARGIN, y, 10.5f, BODY)
        y += 15f
        text(c, "측정: " + (meta.sources.ifEmpty { listOf("스마트워치") }.joinToString(", ")) + " → Health Connect → 펄스케어 앱 요약", MARGIN, y, 9.5f, MUTED)

        y += 26f
        val cols = floatArrayOf(MARGIN, 200f, 280f, 385f, 450f)
        val header = listOf("항목", "평균", "범위 (최소–최대)", "측정", "앞 절반 → 뒤 절반")
        header.forEachIndexed { i, h -> text(c, h, cols[i], y, 9.5f, MUTED, bold = true) }
        y += 6f
        hline(c, y)
        val half = s.days / 2
        val rows = listOf(
            row("수면 시간 (시:분)", s.sleep, s.days, ::hm),
            listOf("취침 시각 (중앙값)", s.bedtime?.let { "%02d:%02d".format(Locale.ROOT, it.hour, it.minute) } ?: "-", "", "", ""),
            listOf("6시간 미만 수면", "${s.shortNights}밤", "", "", ""),
            row("안정시 심박 (bpm)", s.restingHr, s.days) { "${it.roundToInt()}" },
            row("HRV, 수면 중 RMSSD (ms)", s.hrv, s.days) { "${it.roundToInt()}" },
            row("걸음 수 (하루)", s.steps, s.days) { "%,d".format(Locale.ROOT, it.roundToInt()) },
            row("호흡수, 수면 중 (회/분)", s.respiratoryRate, s.days) { "%.1f".format(Locale.ROOT, it) },
            listOf("SpO2 90% 미만 반복", if (s.spo2Nights == 0) "측정 없음" else "${s.lowSpo2Nights}밤", "", if (s.spo2Nights == 0) "" else "${s.spo2Nights}밤", ""),
        )
        rows.forEach { r ->
            y += 19f
            r.forEachIndexed { i, v -> text(c, v, cols[i], y, 10.5f, if (i == 0) NAVY else BODY) }
            y += 6f
            hline(c, y, LINE)
        }
        text(c, "앞 절반 = 처음 ${half}일, 뒤 절반 = 나머지 ${s.days - half}일의 평균", MARGIN, y + 14f, 8.5f, MUTED)

        y += 34f
        val w = (WIDTH - MARGIN * 2 - 16f) / 2
        val h = 110f
        chart(c, MARGIN, y, w, h, "수면 시간 (시간)", s.dailySleep.map { it?.div(60) }, bars = true, s)
        chart(c, MARGIN + w + 16f, y, w, h, "안정시 심박 (bpm)", s.dailyRestingHr, bars = false, s)
        y += h + 34f
        chart(c, MARGIN, y, w, h, "HRV (ms)", s.dailyHrv, bars = false, s)
        chart(c, MARGIN + w + 16f, y, w, h, "걸음 수", s.dailySteps, bars = true, s)

        y += h + 40f
        text(c, "평소와 다른 패턴이 이어진 날", MARGIN, y, 12f, NAVY, bold = true)
        y += 4f
        val shown = s.signals.take(5)
        if (shown.isEmpty()) {
            y += 16f
            text(c, "이 기간에 앱의 주의 기준(3일 이상 연속 등)에 해당한 날이 없어요.", MARGIN, y, 10f, BODY)
        }
        shown.forEach {
            y += 16f
            text(c, "${it.date.format(SHORT)}  ${ClinicReport.label(it.detection)}", MARGIN, y, 10f, AMBER)
        }
        if (s.signals.size > shown.size) {
            y += 16f
            text(c, "외 ${s.signals.size - shown.size}건은 다음 장에", MARGIN, y, 9.5f, MUTED)
        }
    }

    private fun second(c: Canvas, s: ClinicSummary) {
        var y = 56f
        text(c, "주간 평균", MARGIN, y, 14f, NAVY, bold = true)
        y += 20f
        val cols = floatArrayOf(MARGIN, 170f, 280f, 380f, 470f)
        listOf("주 (월요일)", "수면 시간", "안정시 심박", "HRV", "걸음 수").forEachIndexed { i, h -> text(c, h, cols[i], y, 9.5f, MUTED, bold = true) }
        y += 6f
        hline(c, y)
        s.weeks.forEach { w ->
            y += 17f
            listOf(
                w.monday.format(DATE),
                w.sleepMinutes?.let(::hm) ?: "-",
                w.restingHr?.let { "${it.roundToInt()} bpm" } ?: "-",
                w.hrv?.let { "${it.roundToInt()} ms" } ?: "-",
                w.steps?.let { "%,d".format(Locale.ROOT, it.roundToInt()) } ?: "-",
            ).forEachIndexed { i, v -> text(c, v, cols[i], y, 10f, if (i == 0) NAVY else BODY) }
            y += 5f
            hline(c, y, LINE)
        }

        if (s.signals.size > 5) {
            y += 30f
            text(c, "평소와 다른 패턴이 이어진 날 (계속)", MARGIN, y, 12f, NAVY, bold = true)
            s.signals.drop(5).take(20).forEach {
                y += 15f
                text(c, "${it.date.format(SHORT)}  ${ClinicReport.label(it.detection)}", MARGIN, y, 10f, AMBER)
            }
        }

        y += 32f
        text(c, "생활 습관", MARGIN, y, 12f, NAVY, bold = true)
        y += 17f
        text(c, "미션(하루 한 가지 생활 습관 실천) ${s.missionDays}일 / 기록 ${s.missionLogged}일", MARGIN, y, 10f, BODY)
        s.scoreMean?.let {
            y += 15f
            text(c, "앱 컨디션 점수 평균 $it (0~100, 본인 평소 대비 지표로 의학적 기준이 아님)", MARGIN, y, 10f, BODY)
        }

        y += 32f
        text(c, "측정값 설명", MARGIN, y, 12f, NAVY, bold = true)
        listOf(
            "수면 시간: 워치가 잠든 것으로 판단한 시간 (낮잠은 최대 1시간 포함). 날짜는 깨어난 날 기준.",
            "안정시 심박: 워치·헬스 앱이 계산한 하루 안정시 심박 (없으면 수면 중 값의 중앙값).",
            "HRV: 수면 중 심박 변이(RMSSD)의 중앙값. 사람마다 범위가 크게 달라 본인 추이로만 봅니다.",
            "SpO2: 수면 중 산소포화도가 90% 미만으로 떨어진 구간이 5분 넘게 떨어져 두 번 이상 있었던 밤.",
            "주의 기준은 의료 자문 전 초안이며, 본인의 지난 28일 기록과 비교합니다.",
        ).forEach {
            y = paragraph(c, "· $it", MARGIN, y + 15f, WIDTH - MARGIN * 2, 9.5f, BODY)
        }
    }

    private fun footer(c: Canvas, index: Int) {
        val y = HEIGHT - 40f
        hline(c, y - 14f, LINE)
        paragraph(
            c,
            "이 문서는 스마트워치 기록을 펄스케어 앱이 요약한 것으로, 의료기기 측정값이 아니며 진단에 쓸 수 없습니다. " +
                "착용 상태와 기기에 따라 오차가 있을 수 있습니다.",
            MARGIN, y, WIDTH - MARGIN * 2 - 40f, 8f, MUTED,
        )
        text(c, "${index + 1} / $PAGES", WIDTH - MARGIN - 24f, y, 8f, MUTED)
    }

    // --- 그리기 도구 ---

    private fun row(label: String, st: Stat, days: Int, fmt: (Double) -> String): List<String> = listOf(
        label,
        st.mean?.let(fmt) ?: "-",
        if (st.min != null && st.max != null) "${fmt(st.min!!)} – ${fmt(st.max!!)}" else "-",
        "${st.days}/${days}일",
        if (st.firstHalf != null && st.secondHalf != null) "${fmt(st.firstHalf!!)} → ${fmt(st.secondHalf!!)}" else "-",
    )

    private fun hm(minutes: Double): String = minutes.roundToInt().let { "${it / 60}:%02d".format(Locale.ROOT, it % 60) }

    private fun paint(size: Float, color: Int, bold: Boolean = false) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = size
        this.color = color
        typeface = Typeface.create(Typeface.DEFAULT, if (bold) Typeface.BOLD else Typeface.NORMAL)
    }

    private fun text(c: Canvas, s: String, x: Float, y: Float, size: Float, color: Int, bold: Boolean = false) =
        c.drawText(s, x, y, paint(size, color, bold))

    /** 글자 단위로 줄을 바꿉니다 (한국어는 띄어쓰기보다 글자 기준이 자연스러움). 마지막 줄의 y를 돌려줍니다. */
    private fun paragraph(c: Canvas, s: String, x: Float, y: Float, width: Float, size: Float, color: Int): Float {
        val p = paint(size, color)
        var line = ""
        var yy = y
        s.forEach { ch ->
            if (p.measureText(line + ch) > width) {
                c.drawText(line, x, yy, p)
                line = ch.toString().trimStart()
                yy += size * 1.45f
            } else {
                line += ch
            }
        }
        if (line.isNotEmpty()) c.drawText(line, x, yy, p)
        return yy
    }

    private fun hline(c: Canvas, y: Float, color: Int = NAVY) =
        c.drawLine(MARGIN, y, WIDTH - MARGIN, y, Paint().apply { this.color = color; strokeWidth = 0.6f })

    /** 작은 차트: 막대 또는 선, 세로축 최소·최대 값, 가로축 처음·마지막 날짜. 값이 없는 날은 비웁니다. */
    private fun chart(c: Canvas, x: Float, y: Float, w: Float, h: Float, title: String, values: List<Double?>, bars: Boolean, s: ClinicSummary) {
        text(c, title, x, y, 10f, NAVY, bold = true)
        val top = y + 8f
        val plot = RectF(x + 30f, top, x + w, top + h - 18f)
        c.drawRect(plot, Paint().apply { color = LINE; style = Paint.Style.STROKE; strokeWidth = 0.6f })
        val known = values.filterNotNull()
        if (known.isEmpty()) {
            text(c, "기록 없음", plot.left + 8f, plot.centerY(), 9f, MUTED)
            return
        }
        val lo = if (bars) 0.0 else known.min() - (known.max() - known.min()).coerceAtLeast(2.0) * 0.2
        val hi = known.max() + (known.max() - lo).coerceAtLeast(1.0) * 0.1
        fun py(v: Double) = (plot.bottom - (v - lo) / (hi - lo) * plot.height()).toFloat()
        val slot = plot.width() / values.size
        // 기간 평균선
        val mean = known.average()
        c.drawLine(plot.left, py(mean), plot.right, py(mean), Paint().apply { color = BAND; strokeWidth = 3f })
        val label = { v: Double -> if (hi > 1000) "%,d".format(Locale.ROOT, v.roundToInt()) else if (hi < 20) "%.1f".format(Locale.ROOT, v) else v.roundToInt().toString() }
        text(c, label(hi), x, plot.top + 8f, 7.5f, MUTED)
        text(c, label(lo), x, plot.bottom, 7.5f, MUTED)
        if (bars) {
            val fill = Paint().apply { color = TEAL }
            values.forEachIndexed { i, v ->
                v ?: return@forEachIndexed
                val bw = (slot * 0.65f).coerceAtLeast(1f)
                val left = plot.left + i * slot + (slot - bw) / 2
                c.drawRect(left, py(v), left + bw, plot.bottom, fill)
            }
        } else {
            val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = NAVY; style = Paint.Style.STROKE; strokeWidth = 1.2f }
            val path = Path()
            var started = false
            values.forEachIndexed { i, v ->
                if (v == null) {
                    started = false
                    return@forEachIndexed
                }
                val px = plot.left + i * slot + slot / 2
                if (started) path.lineTo(px, py(v)) else path.moveTo(px, py(v))
                started = true
                c.drawCircle(px, py(v), 1.6f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = NAVY })
            }
            c.drawPath(path, stroke)
        }
        text(c, s.from.format(SHORT), plot.left, plot.bottom + 12f, 7.5f, MUTED)
        val end = s.to.format(SHORT)
        text(c, end, plot.right - paint(7.5f, MUTED).measureText(end), plot.bottom + 12f, 7.5f, MUTED)
    }
}
