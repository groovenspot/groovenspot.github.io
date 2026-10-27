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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.core.net.toUri
import androidx.health.connect.client.PermissionController
import com.groovenspot.pulsecare.history.History
import com.groovenspot.pulsecare.history.Period
import com.groovenspot.pulsecare.alert.AlertFeedback
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.FeedbackResponse
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.metrics.EventRules
import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mobile.metrics.Metrics
import com.groovenspot.pulsecare.mobile.BuildConfig
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.data.Legal
import com.groovenspot.pulsecare.mobile.data.Profile
import com.groovenspot.pulsecare.mobile.PulseApp
import com.groovenspot.pulsecare.mobile.family.FamilyRepository
import com.groovenspot.pulsecare.mobile.family.ServerError
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.history.HistoryRepository
import com.groovenspot.pulsecare.mobile.notify.EveningSchedule
import com.groovenspot.pulsecare.mobile.notify.AlertFeedbackReceiver
import com.groovenspot.pulsecare.mobile.notify.MorningSchedule
import com.groovenspot.pulsecare.mobile.notify.Notifications
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.mobile.today.TodayPlanner
import com.groovenspot.pulsecare.mobile.today.TodayRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // 화면 회전으로 다시 만들어질 때는 세지 않습니다.
        if (savedInstanceState == null) trackOpen(intent)
        setContent { PulseTheme { App() } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        trackOpen(intent)
    }

    private fun trackOpen(intent: Intent?) {
        val source = intent?.getStringExtra(Notifications.EXTRA_OPENED_FROM) ?: "icon"
        Metrics.track(this, EventName.APP_OPENED, mapOf("source" to source))
    }
}

private enum class Stage { CONSENT, GOAL, CONNECT, HOME, HISTORY, FAMILY, SETTINGS, TEST_TOOLS }

@Composable
private fun App() {
    val context = LocalContext.current
    val store = remember { AppStore.get(context) }
    var profile by remember { mutableStateOf(store.profile) }
    var goal by remember { mutableStateOf(profile?.goal) }
    // 동의 버전이 바뀌면 기존 사용자도 한 번 다시 동의합니다.
    var stage by remember {
        mutableStateOf(
            when {
                store.consentVersion < Legal.CONSENT_VERSION -> Stage.CONSENT
                profile == null -> Stage.GOAL
                else -> Stage.HOME
            },
        )
    }
    val openUrl: (String) -> Unit = { url -> context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri())) }
    var granted by remember { mutableStateOf<Set<String>?>(null) }
    // 권한이 바뀌거나 미션을 체크하면 다시 계산합니다.
    var refresh by remember { mutableIntStateOf(0) }
    // 내 정보를 닫으면 연 탭으로 돌아갑니다.
    var returnTo by remember { mutableStateOf(Stage.HOME) }
    val appScope = rememberCoroutineScope()

    val permissionLauncher = rememberLauncherForActivityResult(
        PermissionController.createRequestPermissionResultContract(),
    ) { result ->
        granted = result
        Metrics.track(
            context,
            EventName.WATCH_LINK_ATTEMPTED,
            mapOf(
                "result" to when {
                    result.containsAll(HealthConnectSource.all) -> "all"
                    result.containsAll(HealthConnectSource.required) -> "required"
                    result.isEmpty() -> "none"
                    else -> "partial"
                },
            ),
        )
        if (profile == null) {
            profile = Profile(goal = goal ?: Goal.SLEEP, signupDate = LocalDate.now()).also { store.profile = it }
            Metrics.track(context, EventName.SIGNUP_COMPLETED, mapOf("via" to "organic", "goal" to profile!!.goal.name))
        }
        stage = Stage.HOME
        refresh++
    }
    LaunchedEffect(refresh) { granted = HealthConnectSource.granted(context) }

    val available = remember { HealthConnectSource.isAvailable(context) }
    val canScore = granted?.containsAll(HealthConnectSource.required) == true

    when {
        stage == Stage.CONSENT -> ConsentScreen(onOpen = openUrl, onAgree = { analytics ->
            store.consentVersion = Legal.CONSENT_VERSION
            if (analytics != store.analyticsConsent) Metrics.setConsent(context, analytics)
            stage = if (profile == null) Stage.GOAL else Stage.HOME
        })
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
                    // 이용 통계도 서버에서 지웁니다 (지운 수만 남음).
                    if (store.analyticsConsent) Metrics.forgetAsync(store.installId)
                    // 가족 계정이 있으면 서버 기록도 지웁니다 (연결이 남아 보호자에게 빈 요약이 가지 않도록).
                    store.account?.let { account -> appScope.launch { FamilyRepository.deleteAccount(account.second) } }
                    MorningSchedule.cancel(context)
                    EveningSchedule.cancel(context)
                    store.clear()
                    profile = null
                    goal = null
                    stage = Stage.CONSENT
                },
                onBack = {
                    stage = returnTo
                    refresh++
                },
                onOpenTestTools = if (BuildConfig.DEBUG) ({ stage = Stage.TEST_TOOLS }) else null,
                onOpenUrl = openUrl,
                analytics = store.analyticsConsent,
                onAnalytics = { on -> Metrics.setConsent(context, on) },
                consentDate = store.consentAt.takeIf { it > 0 }?.let {
                    java.time.Instant.ofEpochMilli(it).atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()
                },
            )
        }
        stage == Stage.TEST_TOOLS -> TestTools(onBack = { stage = Stage.SETTINGS })
        else -> EasyMode(profile!!.seniorMode) {
            MainTabs(
                current = when (stage) {
                    Stage.HISTORY -> Tab.HISTORY
                    Stage.FAMILY -> Tab.FAMILY
                    else -> Tab.TODAY
                },
                onTab = {
                    stage = when (it) {
                        Tab.HISTORY -> Stage.HISTORY
                        Tab.FAMILY -> Stage.FAMILY
                        Tab.TODAY -> Stage.HOME
                    }
                },
            ) {
                val openSettings = {
                    returnTo = stage
                    stage = Stage.SETTINGS
                }
                if (stage == Stage.HISTORY) {
                    HistoryTab(refresh, onOpenSettings = openSettings)
                } else if (stage == Stage.FAMILY) {
                    FamilyTab(onOpenSettings = openSettings)
                } else {
                    Home(
                        store,
                        profile!!,
                        refresh,
                        onPermissions = { permissionLauncher.launch(HealthConnectSource.requestable(context)) },
                        onChangeGoal = {
                            store.weekly = null
                            stage = Stage.GOAL
                        },
                        onProfileChanged = { profile = it },
                        onOpenSettings = openSettings,
                    )
                }
            }
        }
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
    val notificationLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        Metrics.track(context, EventName.PUSH_PERMISSION_CHANGED, mapOf("granted" to granted.toString()))
    }
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
    // 알림 응답은 화면에서 바로 바뀌도록 따로 다시 읽습니다.
    var feedbackVersion by remember { mutableIntStateOf(0) }
    val today = state.date
    val feedback = remember(feedbackVersion, today) {
        store.alertFeedback.filter { it.at.toLocalDate() == today }.groupBy { it.detection.signal }.mapValues { (_, l) -> l.maxBy { it.at }.response }
    }
    val snoozed = remember(feedbackVersion) { store.snoozedSignals.filterValues { !today.isAfter(it) } }
    val suggestions = remember(feedbackVersion) {
        AlertFeedback.suggestSnooze(store.alertFeedback, today, store.snoozedSignals, store.snoozeDeclined)
    }
    LaunchedEffect(state.date, state.score.kind) {
        Metrics.trackDaily(
            context, EventName.SCORE_VIEWED, "app",
            mapOf("surface" to "app", "kind" to state.score.kind.name, "day" to EventRules.dayBucket(state.dayIndex)),
        )
    }
    LaunchedEffect(weekly?.weekEnd) {
        weekly?.let { Metrics.trackDaily(context, EventName.WEEKLY_REPORT_VIEWED, it.weekEnd.toString(), mapOf("surface" to "app", "badge" to it.badge.toString())) }
    }
    HomeContent(
        state = state,
        onCompleteMission = {
            store.today?.takeIf { !it.completed }?.let {
                Metrics.track(context, EventName.MISSION_COMPLETED, mapOf("mission_id" to it.missionId, "auto" to "false", "surface" to "app"))
            }
            store.today = store.today?.copy(completed = true)
            reload++
        },
        onSwapMission = {
            store.today?.let { Metrics.track(context, EventName.MISSION_SKIPPED, mapOf("mission_id" to it.missionId, "reason" to "swap")) }
            store.today?.let { store.today = planner.swap(state, it, profile, store.missionLogs) }
            reload++
        },
        onFeeling = { value ->
            // 자가 입력으로 오늘 미션을 다시 고릅니다 (아직 바꾸거나 끝내지 않았을 때만).
            store.today?.takeIf { !it.swapped && !it.completed }?.let { store.today = null }
            Metrics.track(context, EventName.CONDITION_CHECKIN_ANSWERED, mapOf("answered" to "true"))
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
        alertFeedback = feedback,
        snoozeSuggestions = suggestions,
        snoozedUntil = snoozed,
        onAlertFeedback = { d, r ->
            AlertFeedbackReceiver.record(context, d, r, guardian = false)
            feedbackVersion++
        },
        onSnooze = { signal, accept ->
            AlertFeedbackReceiver.snooze(context, signal, accept)
            feedbackVersion++
        },
        onUnsnooze = { signal ->
            AlertFeedbackReceiver.unsnooze(context, signal)
            feedbackVersion++
        },
    )
}

/** 쉽게 보기: 글자를 1.25배로. */
@Composable
private fun EasyMode(on: Boolean, content: @Composable () -> Unit) {
    val density = LocalDensity.current
    CompositionLocalProvider(
        LocalDensity provides if (on) Density(density.density, density.fontScale * 1.25f) else density,
        content = content,
    )
}

@Composable
private fun FamilyTab(onOpenSettings: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var ui by remember {
        mutableStateOf(FamilyUi(FamilyRepository.configured, PulseApp.pushConfigured, me = null, busy = FamilyRepository.hasAccount(context)))
    }
    var reload by remember { mutableIntStateOf(0) }

    // 서버 오류는 그대로 보여 주고(한국어 문장), 연결 오류는 한 줄로.
    fun call(block: suspend () -> FamilyUi) {
        ui = ui.copy(busy = true, error = null)
        scope.launch {
            ui = try {
                block().copy(busy = false, now = Instant.now())
            } catch (e: ServerError) {
                ui.copy(busy = false, error = e.message)
            } catch (e: Exception) {
                ui.copy(busy = false, error = "서버에 연결하지 못했어요. 인터넷을 확인해 주세요.")
            }
        }
    }

    LaunchedEffect(reload) {
        if (FamilyRepository.hasAccount(context)) {
            call {
                val me = FamilyRepository.me(context)
                val family = FamilyRepository.family(context)
                family?.let {
                    Metrics.trackDaily(
                        context, EventName.FAMILY_VIEW_OPENED, "tab",
                        mapOf("wearers" to it.wearers.size.toString(), "guardians" to it.guardians.size.toString()),
                    )
                }
                ui.copy(me = me, family = family)
            }
        }
    }

    FamilyContent(
        ui = ui,
        onStart = { name, phone ->
            call {
                val me = FamilyRepository.start(context, name, phone)
                ui.copy(me = me, family = FamilyRepository.family(context))
            }
        },
        onInvite = { role ->
            call {
                val invite = FamilyRepository.invite(context, role)
                Metrics.track(context, EventName.FAMILY_INVITE_SENT, mapOf("role" to role))
                ui.copy(invite = role to invite)
            }
        },
        onShareInvite = { invite, role ->
            val who = ui.me?.name.orEmpty()
            val text = if (role == "WEARER") {
                "${who}님이 펄스케어 보호자로 초대했어요. 펄스케어 > 가족 탭에서 초대 코드 ${invite.code}를 입력해 주세요. (7일 동안 유효)"
            } else {
                "${who}님이 펄스케어로 함께 건강을 챙기자고 초대했어요. 펄스케어 > 가족 탭에서 초대 코드 ${invite.code}를 입력해 주세요. (7일 동안 유효)"
            }
            context.startActivity(
                Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), "초대 코드 보내기"),
            )
        },
        onCheckCode = { code -> call { FamilyRepository.preview(context, code).let { (name, role) -> ui.copy(pendingAccept = Triple(code, name, role)) } } },
        onAccept = { code ->
            // 초대한 사람이 보호자면 나는 착용자.
            val myRole = if (ui.pendingAccept?.third == "GUARDIAN") "WEARER" else "GUARDIAN"
            call {
                val family = FamilyRepository.accept(context, code)
                Metrics.track(context, EventName.FAMILY_INVITE_ACCEPTED, mapOf("role" to myRole))
                ui.copy(pendingAccept = null, family = family)
            }
        },
        onDismissAccept = { ui = ui.copy(pendingAccept = null) },
        onUnlink = { p ->
            val role = if (ui.family?.guardians?.any { it.person.userId == p.userId } == true) "GUARDIAN" else "WEARER"
            call {
                val family = FamilyRepository.unlink(context, p.userId)
                Metrics.track(context, EventName.FAMILY_MEMBER_REMOVED, mapOf("role" to role))
                ui.copy(family = family)
            }
        },
        onMove = { g, up ->
            val ids = ui.family?.guardians?.map { it.person.userId }?.toMutableList() ?: return@FamilyContent
            val i = ids.indexOf(g.person.userId)
            val j = if (up) i - 1 else i + 1
            if (i < 0 || j !in ids.indices) return@FamilyContent
            ids[i] = ids[j].also { ids[j] = ids[i] }
            call { ui.copy(family = FamilyRepository.order(context, ids)) }
        },
        onAck = { e ->
            call {
                FamilyRepository.ack(context, e.id)
                runCatching { Signal.valueOf(e.signal) }.getOrNull()?.let {
                    AlertFeedbackReceiver.record(context, Detection(it), FeedbackResponse.CONTACTED, guardian = true)
                }
                Notifications.emergencyClosed(context, e.id, "확인했다고 알렸어요", "다른 보호자에게 가는 연락은 멈췄어요.")
                ui.copy(family = FamilyRepository.family(context))
            }
        },
        onAlertFeedback = { signal, response ->
            runCatching { Signal.valueOf(signal) }.getOrNull()?.let { AlertFeedbackReceiver.record(context, Detection(it), response, guardian = true) }
        },
        onCall = { number -> context.startActivity(Intent(Intent.ACTION_DIAL, "tel:$number".toUri())) },
        onReload = { reload++ },
        onOpenSettings = onOpenSettings,
    )
}

@Composable
private fun HistoryTab(refreshKey: Int, onOpenSettings: () -> Unit) {
    val context = LocalContext.current
    var period by remember { mutableStateOf(Period.WEEK) }
    var history by remember { mutableStateOf<History?>(null) }
    var selected by remember { mutableStateOf<LocalDate?>(null) }
    LaunchedEffect(refreshKey, period) {
        history = null
        history = withContext(Dispatchers.IO) { runCatching { HistoryRepository.load(context, period) }.getOrNull() }
        if (history?.days?.none { it.date == selected } != false) selected = history?.days?.lastOrNull()?.date
    }
    HistoryContent(history, period, onPeriod = { period = it }, selected = selected, onSelect = { selected = it }, onOpenSettings = onOpenSettings)
}

@Composable
private fun TestTools(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
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
                serverUrl = BuildConfig.SERVER_URL,
                familyAccount = FamilyRepository.hasAccount(context),
                guardianCount = AppStore.get(context).guardianCount,
                pushConfigured = PulseApp.pushConfigured,
                pushToken = AppStore.get(context).pushToken != null,
                analytics = Metrics.enabled(context),
                queuedEvents = Metrics.queued(context),
                installId = AppStore.get(context).installId,
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
        onFlushEvents = {
            scope.launch {
                withContext(Dispatchers.IO) { Metrics.flush(context) }
                reload++
            }
        },
    )
}

@Composable
private fun Loading() {
    Box(Modifier.fillMaxSize().background(Palette.Paper), contentAlignment = Alignment.Center) {
        Text("어젯밤 기록을 불러오는 중이에요", color = Palette.Muted)
    }
}
