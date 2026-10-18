package com.groovenspot.cardiopacer.exercise

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

object Haptics {
    /** "징-징": two strong pulses when the heart rate climbs above Zone 2. */
    fun zoneExceeded(context: Context) {
        vibrator(context).vibrate(VibrationEffect.createWaveform(longArrayOf(0, 300, 180, 300), -1))
    }

    fun tick(context: Context) {
        vibrator(context).vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK))
    }

    private fun vibrator(context: Context): Vibrator =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(VibratorManager::class.java).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }
}
