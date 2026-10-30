package com.groovenspot.pulsecare.wear

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.NoDataComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.groovenspot.pulsecare.watch.WatchContract
import com.groovenspot.pulsecare.watch.WatchToday
import java.time.LocalDate

/** 워치 페이스에 점수 (0~100 링 또는 짧은 글자). 오늘 점수가 없으면 "-". */
class ScoreComplicationService : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        data(type, WatchToday(LocalDate.now(), 74, null, "", "", "", false))

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? =
        data(request.complicationType, WatchStore.load(this))

    private fun data(type: ComplicationType, w: WatchToday?): ComplicationData? {
        val today = w?.takeIf { it.date == LocalDate.now() }?.score
        val text = PlainComplicationText.Builder(today?.toString() ?: "-").build()
        val description = PlainComplicationText.Builder(
            today?.let { "오늘의 컨디션 ${it}점" } ?: "오늘의 컨디션 점수 없음",
        ).build()
        val tap = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return when (type) {
            ComplicationType.RANGED_VALUE -> RangedValueComplicationData.Builder(
                value = (today ?: 0).toFloat(),
                min = 0f,
                max = 100f,
                contentDescription = description,
            ).setText(text).setTapAction(tap).build()
            ComplicationType.SHORT_TEXT -> ShortTextComplicationData.Builder(text, description)
                .setTitle(PlainComplicationText.Builder("컨디션").build())
                .setTapAction(tap)
                .build()
            else -> NoDataComplicationData()
        }
    }
}
