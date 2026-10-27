package com.groovenspot.pulsecare.mobile.notify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import com.groovenspot.pulsecare.mobile.data.AppStore
import java.time.LocalDate

/** 저녁 요약의 "내일 다시" / "다른 미션으로" 버튼. 앱을 열지 않고 답할 수 있습니다. */
class EveningActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val store = AppStore.get(context)
        val tomorrow = LocalDate.now().plusDays(1)
        when (intent.action) {
            ACTION_RETRY -> intent.getStringExtra(EXTRA_MISSION)?.let { store.retry = tomorrow to it }
            ACTION_OTHER -> store.retry = null
        }
        NotificationManagerCompat.from(context).cancel(Notifications.EVENING_ID)
    }

    companion object {
        const val ACTION_RETRY = "com.groovenspot.pulsecare.RETRY_TOMORROW"
        const val ACTION_OTHER = "com.groovenspot.pulsecare.OTHER_MISSION"
        const val EXTRA_MISSION = "mission"
    }
}
