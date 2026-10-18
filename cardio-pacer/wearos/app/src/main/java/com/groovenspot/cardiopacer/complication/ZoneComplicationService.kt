package com.groovenspot.cardiopacer.complication

import android.app.PendingIntent
import android.content.Intent
import android.graphics.drawable.Icon
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.MonochromaticImage
import androidx.wear.watchface.complications.data.MonochromaticImageComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.groovenspot.cardiopacer.R
import com.groovenspot.cardiopacer.data.ZoneSettings
import com.groovenspot.cardiopacer.ui.MainActivity
import com.groovenspot.cardiopacer.zone.ZoneRange

/** Watch face complication: shows the Zone 2 target and launches the app with one tap. */
class ZoneComplicationService : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? = build(type, ZoneRange(130, 145))

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? =
        build(request.complicationType, ZoneSettings.get(this).zone2Range)

    private fun build(type: ComplicationType, range: ZoneRange): ComplicationData? {
        val tap = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val icon = MonochromaticImage.Builder(Icon.createWithResource(this, R.drawable.ic_heart)).build()
        val description = text("Cardio Pacer, Zone 2 ${range.lower}–${range.upper} BPM")

        return when (type) {
            ComplicationType.SHORT_TEXT ->
                ShortTextComplicationData.Builder(text("Z2"), description)
                    .setMonochromaticImage(icon)
                    .setTapAction(tap)
                    .build()
            ComplicationType.LONG_TEXT ->
                LongTextComplicationData.Builder(text("Zone 2 · ${range.label} BPM"), description)
                    .setTitle(text("Cardio Pacer"))
                    .setMonochromaticImage(icon)
                    .setTapAction(tap)
                    .build()
            ComplicationType.MONOCHROMATIC_IMAGE ->
                MonochromaticImageComplicationData.Builder(icon, description)
                    .setTapAction(tap)
                    .build()
            else -> null
        }
    }

    private fun text(value: String) = PlainComplicationText.Builder(value).build()
}
