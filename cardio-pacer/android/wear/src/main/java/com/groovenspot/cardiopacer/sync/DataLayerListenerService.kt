package com.groovenspot.cardiopacer.sync

import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import com.groovenspot.cardiopacer.data.ZoneSettings
import org.json.JSONObject

/** Receives zone settings changed in the phone app. */
class DataLayerListenerService : WearableListenerService() {
    override fun onDataChanged(dataEvents: DataEventBuffer) {
        // Called on a background thread, so blocking on the task is fine here.
        val localNodeId = runCatching { Tasks.await(Wearable.getNodeClient(this).localNode).id }.getOrNull()
        for (event in dataEvents) {
            val item = event.dataItem
            if (event.type != DataEvent.TYPE_CHANGED || item.uri.path != DataPaths.PROFILE) continue
            // Ignore our own writes coming back.
            if (item.uri.host == localNodeId) continue

            val json = DataMapItem.fromDataItem(item).dataMap.getString(DataPaths.KEY_JSON) ?: continue
            runCatching { zoneProfileFromJson(JSONObject(json)) }
                .onSuccess { ZoneSettings.get(this).applyFromPhone(it) }
        }
    }
}
