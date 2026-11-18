package com.groovenspot.pulsecare.wear

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService
import com.groovenspot.pulsecare.watch.WatchContract

/** 폰이 오늘 요약을 바꾸면 받아 저장합니다. */
class WatchListenerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        events.filter { it.type == DataEvent.TYPE_CHANGED && it.dataItem.uri.path == WatchContract.PATH_TODAY }.forEach { event ->
            val map = DataMapItem.fromDataItem(event.dataItem).dataMap
            WatchContract.decode(map.keySet().associateWith { map.getString(it) })?.let { WatchStore.save(this, it) }
        }
    }
}
