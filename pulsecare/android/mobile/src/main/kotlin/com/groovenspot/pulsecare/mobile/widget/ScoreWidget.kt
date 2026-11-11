package com.groovenspot.pulsecare.mobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.groovenspot.pulsecare.mobile.R
import com.groovenspot.pulsecare.mobile.notify.Notifications
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.mobile.ui.MainActivity
import com.groovenspot.pulsecare.watch.WatchContract
import com.groovenspot.pulsecare.watch.WatchToday
import java.time.LocalDate

/**
 * 홈 화면 위젯: 오늘 점수·구간·이유와 미션. 워치 화면과 같은 글자(WatchContract.display)를 씁니다.
 * 앱이 오늘 계획을 만들 때마다 바뀌고, 날이 바뀌었는데 아직 새 계획이 없으면 "어제 기록"으로 보입니다.
 */
class ScoreWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { manager.updateAppWidget(it, views(context, load(context))) }
    }

    companion object {
        private const val PREFS = "pulsecare_widget"

        fun update(context: Context, home: HomeState) {
            val today = WatchToday(
                date = home.date,
                score = home.score.score,
                band = home.score.band,
                reason = home.score.reason,
                missionId = home.mission.id,
                missionTitle = home.mission.title,
                missionDone = home.missionDone,
                learningDay = home.dayIndex.takeIf { home.learning },
            )
            val editor = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear()
            WatchContract.encode(today).forEach { (k, v) -> editor.putString(k, v) }
            editor.apply()
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, ScoreWidget::class.java))
            ids.forEach { manager.updateAppWidget(it, views(context, today)) }
        }

        /** "기록 지우기" 뒤에는 연결 전 화면으로. */
        fun clear(context: Context) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
            val manager = AppWidgetManager.getInstance(context)
            manager.getAppWidgetIds(ComponentName(context, ScoreWidget::class.java)).forEach { manager.updateAppWidget(it, views(context, null)) }
        }

        private fun load(context: Context): WatchToday? {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            return WatchContract.decode(prefs.all.mapValues { it.value as? String })
        }

        private fun views(context: Context, today: WatchToday?): RemoteViews {
            val d = WatchContract.display(today, LocalDate.now())
            val open = PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    .putExtra(Notifications.EXTRA_OPENED_FROM, "widget"),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            return RemoteViews(context.packageName, R.layout.widget_score).apply {
                setTextViewText(R.id.widget_score, d.score)
                setTextViewText(R.id.widget_label, if (today == null) "펄스케어" else d.label)
                setTextViewText(R.id.widget_reason, if (today == null) "앱을 열어 오늘 컨디션을 확인하세요" else d.reason)
                setTextViewText(
                    R.id.widget_mission,
                    when {
                        d.mission.isEmpty() -> ""
                        d.missionDone -> "✓ ${d.mission}"
                        else -> "오늘의 미션 · ${d.mission}"
                    },
                )
                setOnClickPendingIntent(R.id.widget_root, open)
            }
        }
    }
}
