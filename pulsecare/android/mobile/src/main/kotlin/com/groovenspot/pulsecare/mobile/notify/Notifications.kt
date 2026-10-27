package com.groovenspot.pulsecare.mobile.notify

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.groovenspot.pulsecare.mobile.R
import com.groovenspot.pulsecare.mobile.ui.MainActivity

/**
 * 알림 채널과 발송. 잠금화면·미리보기에는 수치·병명 없이 공개용 문구만 보이게 합니다 (기획서 12번).
 */
object Notifications {

    const val MORNING = "morning_report"
    const val CAUTION = "caution"

    private const val MORNING_ID = 1
    private const val CAUTION_ID_BASE = 100

    fun createChannels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(MORNING, "아침 리포트", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "매일 아침 컨디션 점수와 오늘의 미션"
                setSound(null, null)
            },
        )
        manager.createNotificationChannel(
            NotificationChannel(CAUTION, "주의 알림", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "며칠째 평소와 다른 패턴이 이어질 때"
            },
        )
    }

    fun canPost(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun morning(context: Context, title: String, body: String, publicText: String) =
        post(context, MORNING, MORNING_ID, title, body, publicText, NotificationCompat.PRIORITY_DEFAULT)

    fun caution(context: Context, index: Int, title: String, body: String, publicText: String) =
        post(context, CAUTION, CAUTION_ID_BASE + index, title, body, publicText, NotificationCompat.PRIORITY_HIGH)

    private fun post(context: Context, channel: String, id: Int, title: String, body: String, publicText: String, priority: Int) {
        if (!canPost(context)) return
        createChannels(context)
        val open = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val publicVersion = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_pulse)
            .setContentTitle(context.getString(R.string.app_name))
            .setContentText(publicText)
            .build()
        val notification = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_pulse)
            .setContentTitle(title)
            .setContentText(body.lineSequence().first())
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setPriority(priority)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publicVersion)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(id, notification)
        } catch (_: SecurityException) {
            // 알림 권한이 그사이 꺼졌으면 조용히 넘어갑니다.
        }
    }
}
