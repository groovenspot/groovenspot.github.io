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
import androidx.core.net.toUri
import com.groovenspot.pulsecare.mobile.R
import com.groovenspot.pulsecare.mobile.ui.MainActivity
import com.groovenspot.pulsecare.report.EveningSummary

/**
 * 알림 채널과 발송. 잠금화면·미리보기에는 수치·병명 없이 공개용 문구만 보이게 합니다 (기획서 12번).
 */
object Notifications {

    const val MORNING = "morning_report"
    const val CAUTION = "caution"
    const val EVENING = "evening_summary"
    const val WEEKLY = "weekly_report"
    const val EMERGENCY = "emergency"

    private const val MORNING_ID = 1
    const val EVENING_ID = 2
    private const val WEEKLY_ID = 3
    private const val CAUTION_ID_BASE = 100
    private const val SOS_ID = 900

    fun createChannels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(MORNING, "아침 리포트", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "매일 아침 컨디션 점수와 오늘의 미션"
                setSound(null, null)
            },
        )
        manager.createNotificationChannel(
            NotificationChannel(EVENING, "저녁 요약", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "밤 9시, 오늘 미션과 하루 정보"
                setSound(null, null)
            },
        )
        manager.createNotificationChannel(
            NotificationChannel(WEEKLY, "주간 리포트", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "일요일 저녁, 한 주 미션과 변화"
                setSound(null, null)
            },
        )
        manager.createNotificationChannel(
            NotificationChannel(CAUTION, "주의 알림", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "며칠째 평소와 다른 패턴이 이어질 때"
            },
        )
        manager.createNotificationChannel(
            NotificationChannel(EMERGENCY, "긴급", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "워치에서 SOS를 눌렀을 때"
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

    /** [retryMissionId]가 있으면 "내일 다시" / "다른 미션으로" 버튼을 붙입니다. */
    fun evening(context: Context, title: String, body: String, retryMissionId: String?) {
        val actions = retryMissionId?.let { id ->
            listOf(
                EveningSummary.RETRY to action(context, EveningActionReceiver.ACTION_RETRY, id, 1),
                EveningSummary.OTHER to action(context, EveningActionReceiver.ACTION_OTHER, id, 2),
            )
        }.orEmpty()
        post(context, EVENING, EVENING_ID, title, body, "오늘 저녁 요약이 있어요", NotificationCompat.PRIORITY_DEFAULT, actions)
    }

    fun weekly(context: Context, title: String, body: String) =
        post(context, WEEKLY, WEEKLY_ID, title, body, "이번 주 리포트가 준비됐어요", NotificationCompat.PRIORITY_DEFAULT)

    /**
     * 워치 SOS. 보호자 연결(서버) 전이라 보호자에게는 아직 가지 않습니다. 그렇게 말하고, 119 전화 화면을 바로 열 수 있게 합니다.
     * 앱은 119에 자동 신고하지 않습니다 (기획서 12번).
     */
    fun sos(context: Context) {
        val dial = PendingIntent.getActivity(
            context,
            3,
            Intent(Intent.ACTION_DIAL, "tel:119".toUri()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        post(
            context,
            EMERGENCY,
            SOS_ID,
            "워치에서 SOS를 눌렀어요",
            "보호자 연결은 아직 준비 중이라 보호자에게는 알리지 않았어요.\n위급하면 119에 전화하세요.",
            "긴급 알림이 있어요",
            NotificationCompat.PRIORITY_MAX,
            listOf("119 연결" to dial),
        )
    }

    private fun action(context: Context, action: String, missionId: String, request: Int): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            request,
            Intent(context, EveningActionReceiver::class.java).setAction(action).putExtra(EveningActionReceiver.EXTRA_MISSION, missionId),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    private fun post(
        context: Context,
        channel: String,
        id: Int,
        title: String,
        body: String,
        publicText: String,
        priority: Int,
        actions: List<Pair<String, PendingIntent>> = emptyList(),
    ) {
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
            .apply { actions.forEach { (label, intent) -> addAction(0, label, intent) } }
            .build()
        try {
            NotificationManagerCompat.from(context).notify(id, notification)
        } catch (_: SecurityException) {
            // 알림 권한이 그사이 꺼졌으면 조용히 넘어갑니다.
        }
    }
}
