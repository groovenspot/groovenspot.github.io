package com.groovenspot.cardiopacer.data

import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import androidx.core.content.edit
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import com.groovenspot.cardiopacer.complication.ZoneComplicationService
import com.groovenspot.cardiopacer.sync.PhoneSync
import com.groovenspot.cardiopacer.sync.toJson
import com.groovenspot.cardiopacer.sync.zoneProfileFromJson
import com.groovenspot.cardiopacer.zone.ZoneProfile
import com.groovenspot.cardiopacer.zone.ZoneRange
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

/** Persists the user's [ZoneProfile] and refreshes the complication when it changes. */
class ZoneSettings private constructor(private val context: Context) {
    private val prefs = context.getSharedPreferences("zone_settings", Context.MODE_PRIVATE)

    private val _profile = MutableStateFlow(load())
    val profile: StateFlow<ZoneProfile?> = _profile.asStateFlow()

    /** Falls back to defaults so the app always has a range to work with. */
    val zone2Range: ZoneRange get() = (_profile.value ?: ZoneProfile.DEFAULT).zone2Range

    /** Saves a change made on the watch and shares it with the phone app. */
    fun save(profile: ZoneProfile) {
        store(profile)
        PhoneSync.publishProfile(context, profile)
    }

    /** Applies a change made in the phone app, without echoing it back. */
    fun applyFromPhone(profile: ZoneProfile) {
        if (profile != _profile.value) store(profile)
    }

    private fun store(profile: ZoneProfile) {
        prefs.edit { putString(KEY, profile.toJson().toString()) }
        _profile.value = profile
        ComplicationDataSourceUpdateRequester
            .create(context, ComponentName(context, ZoneComplicationService::class.java))
            .requestUpdateAll()
    }

    private fun load(): ZoneProfile? =
        prefs.getString(KEY, null)?.let { runCatching { zoneProfileFromJson(JSONObject(it)) }.getOrNull() }

    companion object {
        private const val KEY = "zoneProfile"

        // Holds only the application context, so this can't leak an activity.
        @SuppressLint("StaticFieldLeak")
        @Volatile
        private var instance: ZoneSettings? = null

        fun get(context: Context): ZoneSettings =
            instance ?: synchronized(this) {
                instance ?: ZoneSettings(context.applicationContext).also { instance = it }
            }
    }
}
