package com.groovenspot.cardiopacer.mobile.data

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import androidx.core.content.edit
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.groovenspot.cardiopacer.sync.DataPaths
import com.groovenspot.cardiopacer.sync.WorkoutRecord
import com.groovenspot.cardiopacer.sync.toJson
import com.groovenspot.cardiopacer.sync.zoneProfileFromJson
import com.groovenspot.cardiopacer.zone.ZoneProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import org.json.JSONObject

/** Zone settings and workout history on the phone, kept in sync with the watch. */
class PhoneStore private constructor(private val context: Context) {
    private val prefs = context.getSharedPreferences("cardio_pacer", Context.MODE_PRIVATE)

    private val _profile = MutableStateFlow(loadProfile())
    val profile: StateFlow<ZoneProfile?> = _profile.asStateFlow()

    private val _history = MutableStateFlow(loadHistory())

    /** Newest first. */
    val history: StateFlow<List<WorkoutRecord>> = _history.asStateFlow()

    /** Saves a change made on the phone and sends it to the watch. */
    fun saveProfile(profile: ZoneProfile) {
        storeProfile(profile)
        val request = PutDataMapRequest.create(DataPaths.PROFILE).apply {
            dataMap.putString(DataPaths.KEY_JSON, profile.toJson().toString())
            dataMap.putLong("sentAt", System.currentTimeMillis())
        }.asPutDataRequest().setUrgent()
        Wearable.getDataClient(context).putDataItem(request)
            .addOnFailureListener { Log.w(TAG, "Couldn't queue profile", it) }
    }

    /** Applies a change made on the watch. */
    fun applyFromWatch(profile: ZoneProfile) {
        if (profile != _profile.value) storeProfile(profile)
    }

    /** Adds a workout from the watch; returns false if it was already recorded. */
    @Synchronized
    fun addWorkout(record: WorkoutRecord): Boolean {
        if (_history.value.any { it.id == record.id }) return false
        _history.update { (listOf(record) + it).sortedByDescending(WorkoutRecord::startEpochMillis) }
        persistHistory()
        return true
    }

    @Synchronized
    fun markSavedToHealthConnect(id: String) {
        _history.update { list -> list.map { if (it.id == id) it.copy(savedToHealthConnect = true) else it } }
        persistHistory()
    }

    private fun storeProfile(profile: ZoneProfile) {
        prefs.edit { putString(KEY_PROFILE, profile.toJson().toString()) }
        _profile.value = profile
    }

    private fun persistHistory() {
        prefs.edit { putString(KEY_HISTORY, WorkoutRecord.listToJson(_history.value)) }
    }

    private fun loadProfile(): ZoneProfile? =
        prefs.getString(KEY_PROFILE, null)?.let { runCatching { zoneProfileFromJson(JSONObject(it)) }.getOrNull() }

    private fun loadHistory(): List<WorkoutRecord> =
        prefs.getString(KEY_HISTORY, null)?.let { runCatching { WorkoutRecord.listFromJson(it) }.getOrNull() }
            ?: emptyList()

    companion object {
        private const val TAG = "PhoneStore"
        private const val KEY_PROFILE = "zoneProfile"
        private const val KEY_HISTORY = "history"

        // Holds only the application context, so this can't leak an activity.
        @SuppressLint("StaticFieldLeak")
        @Volatile
        private var instance: PhoneStore? = null

        fun get(context: Context): PhoneStore =
            instance ?: synchronized(this) {
                instance ?: PhoneStore(context.applicationContext).also { instance = it }
            }
    }
}
