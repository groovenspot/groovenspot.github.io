package com.groovenspot.pulsecare.wear

import android.content.Context
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import android.content.ComponentName
import com.groovenspot.pulsecare.watch.WatchContract
import com.groovenspot.pulsecare.watch.WatchToday

/** 폰에서 받은 오늘 요약을 워치에 둡니다. 바뀌면 타일과 컴플리케이션을 다시 그리게 합니다. */
object WatchStore {

    private fun prefs(context: Context) = context.getSharedPreferences("pulsecare_watch", Context.MODE_PRIVATE)

    fun load(context: Context): WatchToday? {
        val p = prefs(context)
        return WatchContract.decode(p.all.mapValues { it.value as? String })
    }

    fun save(context: Context, w: WatchToday) {
        prefs(context).edit().clear().apply { WatchContract.encode(w).forEach { (k, v) -> putString(k, v) } }.apply()
        refreshSurfaces(context)
    }

    fun refreshSurfaces(context: Context) {
        TileService.getUpdater(context).requestUpdate(ScoreTileService::class.java)
        ComplicationDataSourceUpdateRequester
            .create(context, ComponentName(context, ScoreComplicationService::class.java))
            .requestUpdateAll()
    }
}
