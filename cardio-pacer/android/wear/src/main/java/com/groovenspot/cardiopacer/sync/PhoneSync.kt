package com.groovenspot.cardiopacer.sync

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.groovenspot.cardiopacer.zone.ZoneProfile

/**
 * Watch → phone over the Wearable Data Layer. Data items are queued by Google
 * Play services and delivered whenever the phone is reachable, so these calls
 * work the same with or without a paired phone.
 */
object PhoneSync {
    private const val TAG = "PhoneSync"

    fun publishProfile(context: Context, profile: ZoneProfile) {
        put(context, DataPaths.PROFILE, profile.toJson().toString())
    }

    fun sendWorkout(context: Context, record: WorkoutRecord) {
        put(context, DataPaths.WORKOUT_PREFIX + record.startEpochMillis, record.toJson().toString())
    }

    private fun put(context: Context, path: String, json: String) {
        val request = PutDataMapRequest.create(path).apply {
            dataMap.putString(DataPaths.KEY_JSON, json)
            // Forces a change event even when the content is identical.
            dataMap.putLong("sentAt", System.currentTimeMillis())
        }.asPutDataRequest().setUrgent()
        Wearable.getDataClient(context).putDataItem(request)
            .addOnFailureListener { Log.w(TAG, "Couldn't queue $path", it) }
    }
}
