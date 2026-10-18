package com.groovenspot.cardiopacer.mobile.health

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import com.groovenspot.cardiopacer.mobile.data.PhoneStore
import com.groovenspot.cardiopacer.sync.WorkoutRecord
import java.time.Instant
import java.time.ZoneId

/** Saves finished watch workouts to Health Connect as exercise sessions. */
object HealthConnectWriter {
    private const val TAG = "HealthConnectWriter"

    val permissions = setOf(HealthPermission.getWritePermission(ExerciseSessionRecord::class))

    fun isAvailable(context: Context): Boolean =
        HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    suspend fun hasPermission(context: Context): Boolean =
        isAvailable(context) &&
            HealthConnectClient.getOrCreate(context).permissionController
                .getGrantedPermissions().containsAll(permissions)

    /** Writes every workout not yet in Health Connect. Safe to call repeatedly. */
    suspend fun syncPending(context: Context) {
        if (!hasPermission(context)) return
        val store = PhoneStore.get(context)
        for (record in store.history.value.filterNot { it.savedToHealthConnect }) {
            runCatching { write(context, record) }
                .onSuccess { store.markSavedToHealthConnect(record.id) }
                .onFailure { Log.w(TAG, "Couldn't write ${record.id}", it) }
        }
    }

    private suspend fun write(context: Context, record: WorkoutRecord) {
        val start = Instant.ofEpochMilli(record.startEpochMillis)
        val end = Instant.ofEpochMilli(record.endEpochMillis)
        val offset = ZoneId.systemDefault().rules.getOffset(start)
        val session = ExerciseSessionRecord(
            startTime = start,
            startZoneOffset = offset,
            endTime = end,
            endZoneOffset = offset,
            // clientRecordId makes re-sending the same workout an update, not a duplicate.
            metadata = Metadata.activelyRecorded(
                device = Device(type = Device.TYPE_WATCH),
                clientRecordId = record.id,
            ),
            exerciseType = when (record.activity) {
                "CYCLING" -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING
                "WALKING" -> ExerciseSessionRecord.EXERCISE_TYPE_WALKING
                else -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
            },
            title = "Cardio Pacer",
            notes = "Zone 2 달성률 ${record.summary.zone2Percent}% (${record.summary.range.label} BPM)",
        )
        HealthConnectClient.getOrCreate(context).insertRecords(listOf(session))
    }
}
