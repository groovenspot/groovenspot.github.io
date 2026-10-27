package com.groovenspot.pulsecare.mobile.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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
import androidx.compose.ui.platform.LocalContext
import androidx.core.net.toUri
import androidx.health.connect.client.PermissionController
import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.data.Profile
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.health.NightMapper
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.mobile.today.TodayPlanner
import java.time.LocalDate
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { PulseTheme { App() } }
    }
}

private enum class Stage { GOAL, CONNECT, HOME }

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
        stage == Stage.GOAL -> GoalScreen(goal, onSelect = { goal = it }, onNext = { stage = Stage.CONNECT })
        stage == Stage.CONNECT || (granted != null && !canScore) -> ConnectScreen(
            available = available,
            onConnect = { permissionLauncher.launch(HealthConnectSource.all) },
            onInstall = {
                context.startActivity(
                    Intent(Intent.ACTION_VIEW, "market://details?id=com.google.android.apps.healthdata".toUri()),
                )
            },
            onLater = null,
        )
        granted == null -> Loading()
        else -> Home(store, profile!!, granted!!, refresh, onPermissions = { permissionLauncher.launch(HealthConnectSource.all) })
    }
}

@Composable
private fun Home(store: AppStore, profile: Profile, granted: Set<String>, refreshKey: Int, onPermissions: () -> Unit) {
    val context = LocalContext.current
    val planner = remember { TodayPlanner() }
    var home by remember { mutableStateOf<HomeState?>(null) }
    var feeling by remember { mutableStateOf<Int?>(null) }
    var reload by remember { mutableIntStateOf(0) }

    LaunchedEffect(refreshKey, reload, feeling) {
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val from = today.minusDays(29)
        val records = NightMapper.map(HealthConnectSource.read(context, from, today, zone), from, today, zone)
        val plan = planner.plan(
            today = today,
            records = records,
            profile = profile,
            stored = store.today,
            logs = store.missionLogs,
            scores = store.scores,
            feeling = feeling,
            missingPermissions = !granted.containsAll(HealthConnectSource.all),
        )
        store.today = plan.today
        store.missionLogs = plan.logs
        store.scores = plan.scores
        home = plan.home
    }

    val state = home ?: return Loading()
    HomeContent(
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
    )
}

@Composable
private fun Loading() {
    Box(Modifier.fillMaxSize().background(Palette.Paper), contentAlignment = Alignment.Center) {
        Text("어젯밤 기록을 불러오는 중이에요", color = Palette.Muted)
    }
}
