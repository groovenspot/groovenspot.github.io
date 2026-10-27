package com.groovenspot.pulsecare.mobile.ui

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.core.net.toUri
import androidx.health.connect.client.PermissionController
import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mobile.BuildConfig
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.data.Profile
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.notify.EveningSchedule
import com.groovenspot.pulsecare.mobile.notify.MorningSchedule
import com.groovenspot.pulsecare.mobile.notify.Notifications
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.mobile.today.TodayPlanner
import com.groovenspot.pulsecare.mobile.today.TodayRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { PulseTheme { App() } }
    }
}

private enum class Stage { GOAL, CONNECT, HOME, SETTINGS, TEST_TOOLS }

@Composable
private fun App() {
    val context = LocalContext.current
    val store = remember { AppStore.get(context) }
    var profile by remember { mutableStateOf(store.profile) }
    var goal by remember { mutableStateOf(profile?.goal) }
    var stage by remember { mutableStateOf(if (profile == null) Stage.GOAL else Stage.HOME) }
    var granted by remember { mutableStateOf<Set<String>?>(null) }
    // 권한이 바뀌거나 미션을 체크하면 다시 계산합니다.
    var refresh by remember { mutableIntStateOf(0) }

    val permissionLauncher = rememberLauncherForActivityResult(
        PermissionController.createRequestPermissionResultContract(),
    ) { result ->
        granted = result
        if (profile == null) {
            profile = Profile(goal = goal ?: Goal.SLEEP, signupDate = LocalDate.now()).also { store.profile = it }
        }
        stage = Stage.HOME
        refresh++
    }
    LaunchedEffect(refresh) { granted = HealthConnectSource.granted(context) }

    val available = remember { HealthConnectSource.isAvailable(context) }
    val canScore = granted?.containsAll(HealthConnectSource.required) == true

    when {
        stage == Stage.GOAL -> GoalScreen(goal, onSelect = { goal = it }, onNext = {
            val current = profile
            if (current == null) {
                stage = Stage.CONNECT
            } else {
                // 목표 바꾸기: 레벨은 목표별로 따로 두고, 변화 리포트는 새 목표 기준으로 다시 셉니다.
                val chosen = goal ?: current.goal
                profile = current.copy(goal = chosen, goalSince = LocalDate.now()).also { store.profile = it }
                store.today?.takeIf { !it.completed }?.let { store.today = null }
                stage = Stage.HOME
                refresh++
            }
        }, changing = profile != null)
        stage == Stage.CONNECT || (granted != null && !canScore) -> ConnectScreen(
            available = available,
            onConnect = { permissionLauncher.launch(HealthConnectSource.requestable(context)) },
            onInstall = {
                context.startActivity(
                    Intent(Intent.ACTION_VIEW, "market://details?id=com.google.android.apps.healthdata".toUri()),
                )
            },
            onLater = null,
        )
        granted == null -> Loading()
        stage == Stage.SETTINGS -> {
            var settings by remember { mutableStateOf(store.settings) }
            SettingsContent(
                profile = profile!!,
                settings = settings,
                onSettings = { updated ->
                    settings = updated
                    store.settings = updated
                    MorningSchedule.reschedule(context)
                    EveningSchedule.reschedule(context)
                },
                onSeniorMode = { on -> profile = profile!!.copy(seniorMode = on).also { store.profile = it } },
                onChangeGoal = { stage = Stage.GOAL },
                onPermissions = { permissionLauncher.launch(HealthConnectSource.requestable(context)) },
                onClearData = {
                    MorningSchedule.cancel(context)
                    EveningSchedule.cancel(context)
                    store.clear()
                    profile = null
                    goal = null
                    stage = Stage.GOAL
                },
                onBack = {
                    stage = Stage.HOME
                    refresh++
                },
                onOpenTestTools = if (BuildConfig.DEBUG) ({ stage = Stage.TEST_TOOLS }) else null,
            )
        }
        stage == Stage.TEST_TOOLS -> TestTools(onBack = { stage = Stage.SETTINGS })
        else -> Home(
            store,
            profile!!,
            refresh,
            onPermissions = { permissionLauncher.launch(HealthConnectSource.requestable(context)) },
            onChangeGoal = {
                store.weekly = null
                stage = Stage.GOAL
            },
            onProfileChanged = { profile = it },
            onOpenSettings = { stage = Stage.SETTINGS },
        )
    }
}

@Composable
private fun Home(
    store: AppStore,
    profile: Profile,
    refreshKey: Int,
    onPermissions: () -> Unit,
    onChangeGoal: () -> Unit,
    onProfileChanged: (Profile) -> Unit,
    onOpenSettings: () -> Unit,
) {
    val context = LocalContext.current
    val planner = remember { TodayPlanner() }
    var home by remember { mutableStateOf<HomeState?>(null) }
    var feeling by remember { mutableStateOf<Int?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    // 일요일 리포트는 이번 주 월요일까지만 띄웁니다.
    var weekly by remember { mutableStateOf(store.weekly?.takeIf { !LocalDate.now().isAfter(it.weekEnd.plusDays(1)) }) }

    // 아침 7:30 리포트, 저녁 9시 요약 (Android 13+는 알림 권한을 먼저 물어봅니다).
    val notificationLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    LaunchedEffect(Unit) {
        MorningSchedule.ensure(context)
        EveningSchedule.ensure(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !Notifications.canPost(context)) {
            notificationLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    LaunchedEffect(refreshKey, reload, feeling) {
        home = TodayRepository.refresh(context, feeling)
    }

    val state = home ?: return Loading()
    // 쉽게 보기: 글자를 1.25배로.
    val density = LocalDensity.current
    CompositionLocalProvider(
        LocalDensity provides if (profile.seniorMode) Density(density.density, density.fontScale * 1.25f) else density,
    ) { HomeContent(
        state = state,
        onCompleteMission = {
            store.today = store.today?.copy(completed = true)
            reload++
        },
        onSwapMission = {
            store.today?.let { store.today = planner.swap(state, it, profile, store.missionLogs) }
            reload++
        },
        onFeeling = { value ->
            // 자가 입력으로 오늘 미션을 다시 고릅니다 (아직 바꾸거나 끝내지 않았을 때만).
            store.today?.takeIf { !it.swapped && !it.completed }?.let { store.today = null }
            feeling = value
        },
        onOpenPermissions = onPermissions,
        weekly = weekly,
        onWeeklyAccept = {
            weekly?.let { w ->
                val updated = profile.copy(levels = profile.levels + (w.goal to w.nextLevel))
                store.profile = updated
                onProfileChanged(updated)
            }
            store.weekly = null
            weekly = null
        },
        onWeeklyClose = {
            store.weekly = null
            weekly = null
        },
        onChangeGoal = onChangeGoal,
        onOpenSettings = onOpenSettings,
        easyMode = profile.seniorMode,
    ) }
}

@Composable
private fun TestTools(onBack: () -> Unit) {
    val context = LocalContext.current
    var diagnostics by remember { mutableStateOf<Diagnostics?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    LaunchedEffect(reload) {
        diagnostics = null
        diagnostics = withContext(Dispatchers.IO) {
            val granted = HealthConnectSource.granted(context)
            Diagnostics(
                healthConnectAvailable = HealthConnectSource.isAvailable(context),
                backgroundSupported = runCatching { HealthConnectSource.backgroundSupported(context) }.getOrDefault(false),
                backgroundGranted = HealthConnectSource.BACKGROUND in granted,
                notificationsAllowed = Notifications.canPost(context),
                rows = HealthConnectSource.diagnose(context),
                home = runCatching { TodayRepository.refresh(context) }.getOrNull(),
                nextMorning = MorningSchedule.nextRunMillis(context),
                nextEvening = EveningSchedule.nextRunMillis(context),
            )
        }
    }
    DiagnosticsContent(
        d = diagnostics,
        onRunMorning = { MorningSchedule.runNow(context) },
        onRunEvening = { EveningSchedule.runNow(context) },
        onRunWeekly = { EveningSchedule.runNow(context, weekly = true) },
        onReload = { reload++ },
        onBack = onBack,
    )
}

@Composable
private fun Loading() {
    Box(Modifier.fillMaxSize().background(Palette.Paper), contentAlignment = Alignment.Center) {
        Text("어젯밤 기록을 불러오는 중이에요", color = Palette.Muted)
    }
}
