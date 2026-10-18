package com.groovenspot.cardiopacer.mobile.sync

import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import com.groovenspot.cardiopacer.mobile.data.PhoneStore
import com.groovenspot.cardiopacer.mobile.health.HealthConnectWriter
import com.groovenspot.cardiopacer.sync.DataPaths
import com.groovenspot.cardiopacer.sync.WorkoutRecord
import com.groovenspot.cardiopacer.sync.zoneProfileFromJson
import kotlinx.coroutines.runBlocking
import org.json.JSONObject

/** Receives zone settings changed on the watch and finished workouts. */
class WatchDataListenerService : WearableListenerService() {
    override fun onDataChanged(dataEvents: DataEventBuffer) {
        // Called on a background thread, so blocking calls are fine here.
        val dataClient = Wearable.getDataClient(this)
        val localNodeId = runCatching { Tasks.await(Wearable.getNodeClient(this).localNode).id }.getOrNull()
        val store = PhoneStore.get(this)
        var newWorkouts = false

        for (event in dataEvents) {
            val item = event.dataItem
            val path = item.uri.path ?: continue
            if (event.type != DataEvent.TYPE_CHANGED || item.uri.host == localNodeId) continue
            val json = DataMapItem.fromDataItem(item).dataMap.getString(DataPaths.KEY_JSON) ?: continue

            when {
                path == DataPaths.PROFILE ->
                    runCatching { zoneProfileFromJson(JSONObject(json)) }.onSuccess(store::applyFromWatch)
                path.startsWith(DataPaths.WORKOUT_PREFIX) -> {
                    runCatching { WorkoutRecord.fromJson(JSONObject(json)) }
                        .onSuccess { if (store.addWorkout(it)) newWorkouts = true }
                    // Delivered; remove it so the Data Layer doesn't keep every workout forever.
                    runCatching { Tasks.await(dataClient.deleteDataItems(item.uri)) }
                }
            }
        }

        if (newWorkouts) runBlocking { HealthConnectWriter.syncPending(this@WatchDataListenerService) }
    }
}
