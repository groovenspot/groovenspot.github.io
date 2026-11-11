package com.groovenspot.pulsecare.mobile.report

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.health.NightMapper
import com.groovenspot.pulsecare.mobile.metrics.Metrics
import com.groovenspot.pulsecare.report.ClinicReport
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/** 진료용 요약 PDF를 만들고 공유합니다. 파일은 앱 캐시에만 두고 서버로 보내지 않습니다. */
object ClinicExport {

    /** 미션 P-08 "한 달 건강 요약을 진료 때 공유". */
    const val MISSION_ID = "P-08"

    suspend fun create(context: Context, days: Int, name: String?, zone: ZoneId = ZoneId.systemDefault()): File = withContext(Dispatchers.IO) {
        val store = AppStore.get(context)
        val today = LocalDate.now(zone)
        val from = today.minusDays(days - 1L)
        // 신호 판정에 기준선 28일이 더 필요합니다.
        val readFrom = from.minusDays(35)
        val raw = HealthConnectSource.read(context, readFrom, today, zone)
        val records = NightMapper.map(raw, readFrom, today, zone)
        val signup = store.profile?.signupDate ?: readFrom
        val logs = store.missionLogs + listOfNotNull(store.today?.let { MissionLog(it.date, it.missionId, it.completed, it.auto) })
        val summary = ClinicReport.build(from, today, records, logs, store.scores) { d -> ChronoUnit.DAYS.between(signup, d).toInt() + 1 }
        val sources = runCatching { HealthConnectSource.diagnose(context, days.toLong()) }.getOrDefault(emptyList())
            .filter { it.label in setOf("수면", "HRV", "안정시 심박") }
            .flatMap { it.sources }.distinct()
        File(context.cacheDir, "reports/pulsecare-summary-$today.pdf").also {
            ClinicPdf.write(it, summary, ClinicMeta(name, today, sources))
        }
    }

    /** 공유 시트를 열고, 오늘 미션이 P-08이면 완료로 남깁니다. */
    fun share(context: Context, file: File, days: Int) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.reports", file)
        val send = Intent(Intent.ACTION_SEND)
            .setType("application/pdf")
            .putExtra(Intent.EXTRA_STREAM, uri)
            .putExtra(Intent.EXTRA_SUBJECT, "건강 요약 (최근 ${days}일)")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        context.startActivity(Intent.createChooser(send, "건강 요약 보내기").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
        Metrics.track(context, EventName.REPORT_EXPORTED, mapOf("days" to days.toString()))
        val store = AppStore.get(context)
        store.today?.takeIf { it.missionId == MISSION_ID && !it.completed && it.date == LocalDate.now() }?.let {
            store.today = it.copy(completed = true)
            Metrics.track(context, EventName.MISSION_COMPLETED, mapOf("mission_id" to MISSION_ID, "auto" to "false", "surface" to "report"))
        }
    }
}
