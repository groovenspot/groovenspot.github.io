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
import com.groovenspot.pulsecare.mobile.chat.ChatMessage
import com.groovenspot.pulsecare.mobile.chat.ChatRepository
import com.groovenspot.pulsecare.mobile.data.AppStore
import com.groovenspot.pulsecare.mobile.data.Legal
import com.groovenspot.pulsecare.mobile.data.Profile
import com.groovenspot.pulsecare.mobile.PulseApp
import com.groovenspot.pulsecare.mobile.family.FamilyRepository
import com.groovenspot.pulsecare.mobile.family.ServerError
import com.groovenspot.pulsecare.mobile.family.SosResult
import com.groovenspot.pulsecare.mobile.health.HealthConnectSource
import com.groovenspot.pulsecare.mobile.history.HistoryRepository
import com.groovenspot.pulsecare.mobile.notify.EveningSchedule
import com.groovenspot.pulsecare.mobile.notify.HeartRateWorker
import com.groovenspot.pulsecare.mobile.notify.AlertFeedbackReceiver
import com.groovenspot.pulsecare.mobile.notify.MorningSchedule
import com.groovenspot.pulsecare.mobile.notify.Notifications
import com.groovenspot.pulsecare.mobile.report.ClinicExport
import com.groovenspot.pulsecare.mobile.today.HomeState
import com.groovenspot.pulsecare.mobile.today.TodayPlanner
import com.groovenspot.pulsecare.mobile.today.TodayRepository
import com.groovenspot.pulsecare.watch.WatchContract
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

private enum class Stage { CONSENT, GOAL, CONNECT, HOME, HISTORY, FAMILY, SETTINGS, TEST_TOOLS, CHAT }

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
    // AI 상담에 넘길 오늘 홈 (화면을 닫으면 대화와 함께 버립니다).
    var lastHome by remember { mutableStateOf<HomeState?>(null) }
    var chat by remember { mutableStateOf(ChatUi(ChatRepository.configured, store.chatConsent)) }
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
            Metrics.track(context, EventName.SIGNUP_COMPLETED, mapOf("via" to "organic", "goal" to profile!!.goal.name, "mode" to "watch"))
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
        stage == Stage.CONNECT || (granted != null && !canScore && profile?.guardianOnly != true) -> ConnectScreen(
            available = available,
            onConnect = { permissionLauncher.launch(HealthConnectSource.requestable(context)) },
            onInstall = {
                context.startActivity(
                    Intent(Intent.ACTION_VIEW, "market://details?id=com.google.android.apps.healthdata".toUri()),
                )
            },
            // 부모님을 챙기려는 사람은 워치가 없어도 보호자로 시작할 수 있습니다.
            onLater = if ((goal ?: profile?.goal) == Goal.PARENT) {
                {
                    val current = profile
                    if (current == null) {
                        profile = Profile(goal = Goal.PARENT, signupDate = LocalDate.now(), guardianOnly = true).also { store.profile = it }
                        Metrics.track(context, EventName.SIGNUP_COMPLETED, mapOf("via" to "organic", "goal" to Goal.PARENT.name, "mode" to "guardian"))
                    } else {
                        profile = current.copy(guardianOnly = true).also { store.profile = it }
                    }
                    stage = Stage.HOME
                    refresh++
                }
            } else {
                null
            },
            laterLabel = "워치가 없어요 · 보호자로만 쓸게요",
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
                    // 아직 보내지 않은 이벤트도 버립니다 (다시 동의하면 새 설치 ID로 옛 기록이 올라가지 않게).
                    Metrics.clearQueue(context)
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
                onConnectWatch = if (profile!!.guardianOnly) ({
                    profile = profile!!.copy(guardianOnly = false).also { store.profile = it }
                    returnTo = Stage.HOME
                    permissionLauncher.launch(HealthConnectSource.requestable(context))
                }) else null,
                analytics = store.analyticsConsent,
                onAnalytics = { on -> Metrics.setConsent(context, on) },
                consentDate = store.consentAt.takeIf { it > 0 }?.let {
                    java.time.Instant.ofEpochMilli(it).atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()
                },
            )
        }
        stage == Stage.TEST_TOOLS -> TestTools(onBack = { stage = Stage.SETTINGS })
        stage == Stage.CHAT -> ChatContent(
            ui = chat,
            suggestions = ChatRepository.SUGGESTIONS,
            onAgree = {
                store.chatConsent = true
                chat = chat.copy(consented = true)
            },
            onSend = { text ->
                if (text.isBlank() || chat.sending) return@ChatContent
                val history = chat.messages + ChatMessage(fromUser = true, text = text)
                chat = chat.copy(messages = history, sending = true, error = null)
                appScope.launch {
                    val result = runCatching { ChatRepository.send(context, history, lastHome) }
                    // 기다리는 사이 화면을 닫았으면(대화를 버렸으면) 답을 되살리지 않습니다.
                    if (!chat.sending || chat.messages != history) return@launch
                    chat = result.fold(
                        onSuccess = { (reply, remaining) -> chat.copy(messages = history + reply, sending = false, remaining = remaining.takeIf { it >= 0 }) },
                        onFailure = { e ->
                            if (e is kotlinx.coroutines.CancellationException) throw e
                            chat.copy(sending = false, error = (e as? ServerError)?.message ?: "서버에 연결하지 못했어요. 인터넷을 확인해 주세요.")
                        },
                    )
                }
            },
            onBack = {
                // 대화는 저장하지 않습니다.
                chat = ChatUi(ChatRepository.configured, store.chatConsent)
                stage = Stage.HOME
            },
        )
        else -> EasyMode(profile!!.seniorMode) {
            val guardianOnly = profile!!.guardianOnly
            MainTabs(
                tabs = if (guardianOnly) listOf(Tab.TODAY, Tab.FAMILY) else Tab.entries,
                label = { if (guardianOnly && it == Tab.TODAY) "부모님" else it.label },
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
                    FamilyTab(onOpenSettings = openSettings, guardianMode = guardianOnly)
                } else if (guardianOnly) {
                    GuardianTab(store, refresh, onOpenFamily = { stage = Stage.FAMILY }, onOpenSettings = openSettings)
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
                        onOpenChat = if (ChatRepository.configured) ({ stage = Stage.CHAT }) else null,
                        onHomeLoaded = { lastHome = it },
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
    onOpenChat: (() -> Unit)? = null,
    onHomeLoaded: (HomeState) -> Unit = {},
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
        HeartRateWorker.ensure(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !Notifications.canPost(context)) {
            notificationLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    LaunchedEffect(refreshKey, reload, feeling) {
        home = TodayRepository.refresh(context, feeling)
    }

    val state = home ?: return Loading()
    LaunchedEffect(state) { onHomeLoaded(state) }
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
    val onCompleteMission: () -> Unit = {
        store.today?.takeIf { !it.completed }?.let {
            Metrics.track(context, EventName.MISSION_COMPLETED, mapOf("mission_id" to it.missionId, "auto" to "false", "surface" to "app"))
        }
        store.today = store.today?.copy(completed = true)
        reload++
    }
    val onFeeling: (Int) -> Unit = { value ->
        // 자가 입력으로 오늘 미션을 다시 고릅니다 (아직 바꾸거나 끝내지 않았을 때만).
        store.today?.takeIf { !it.swapped && !it.completed }?.let { store.today = null }
        Metrics.track(context, EventName.CONDITION_CHECKIN_ANSWERED, mapOf("answered" to "true"))
        feeling = value
    }
    val onAlertFeedback: (Detection, FeedbackResponse) -> Unit = { d, r ->
        AlertFeedbackReceiver.record(context, d, r, guardian = false)
        feedbackVersion++
    }
    if (profile.seniorMode) {
        EasyHome(store, state, onComplete = onCompleteMission, onFeeling = onFeeling, feedback = feedback, onAlertFeedback = onAlertFeedback, onOpenSettings = onOpenSettings)
        return
    }
    HomeContent(
        state = state,
        onCompleteMission = onCompleteMission,
        onSwapMission = {
            store.today?.let { Metrics.track(context, EventName.MISSION_SKIPPED, mapOf("mission_id" to it.missionId, "reason" to "swap")) }
            store.today?.let { store.today = planner.swap(state, it, profile, store.missionLogs) }
            reload++
        },
        onFeeling = onFeeling,
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
        onAlertFeedback = onAlertFeedback,
        onSnooze = { signal, accept ->
            AlertFeedbackReceiver.snooze(context, signal, accept)
            feedbackVersion++
        },
        onUnsnooze = { signal ->
            AlertFeedbackReceiver.unsnooze(context, signal)
            feedbackVersion++
        },
        onOpenChat = onOpenChat,
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
private fun FamilyTab(onOpenSettings: () -> Unit, guardianMode: Boolean = false) {
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
                if (e.code == "UNAUTHORIZED") {
                    // 다른 폰으로 옮겼거나 탈퇴한 계정: 이 폰의 계정 정보를 지웁니다.
                    AppStore.get(context).account = null
                    ui.copy(busy = false, me = null, family = null, error = "가족 계정이 다른 폰으로 옮겨져 이 폰에서는 로그아웃됐어요.")
                } else {
                    ui.copy(busy = false, error = e.message)
                }
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
        guardianMode = guardianMode,
        onRestore = { code ->
            call {
                val me = FamilyRepository.restore(context, code)
                ui.copy(me = me, family = FamilyRepository.family(context))
            }
        },
        onTransfer = { call { ui.copy(transfer = FamilyRepository.transferCode(context)) } },
        onDismissTransfer = { ui = ui.copy(transfer = null) },
    )
}

/** 워치 없는 보호자의 "부모님" 탭: 부모님 오늘 카드와 오늘의 보호자 미션. */
@Composable
private fun GuardianTab(store: AppStore, refreshKey: Int, onOpenFamily: () -> Unit, onOpenSettings: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var home by remember { mutableStateOf<HomeState?>(null) }
    var ui by remember { mutableStateOf(FamilyUi(FamilyRepository.configured, PulseApp.pushConfigured, me = null)) }
    var reload by remember { mutableIntStateOf(0) }

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
    LaunchedEffect(refreshKey, reload) {
        home = runCatching { TodayRepository.refresh(context) }.getOrNull()
        if (!FamilyRepository.hasAccount(context)) return@LaunchedEffect
        ui = try {
            val me = FamilyRepository.me(context)
            val family = FamilyRepository.family(context)
            family?.let {
                Metrics.trackDaily(
                    context, EventName.FAMILY_VIEW_OPENED, "guardian_home",
                    mapOf("wearers" to it.wearers.size.toString(), "guardians" to it.guardians.size.toString()),
                )
            }
            ui.copy(me = me, family = family, error = null, now = Instant.now())
        } catch (e: ServerError) {
            ui.copy(error = e.message)
        } catch (e: Exception) {
            ui.copy(error = "서버에 연결하지 못했어요. 인터넷을 확인해 주세요.")
        }
    }

    GuardianHomeContent(
        date = home?.date ?: LocalDate.now(),
        ui = ui,
        mission = home?.mission,
        missionDone = home?.missionDone == true,
        onCompleteMission = {
            store.today?.takeIf { !it.completed }?.let {
                Metrics.track(context, EventName.MISSION_COMPLETED, mapOf("mission_id" to it.missionId, "auto" to "false", "surface" to "app"))
                store.today = it.copy(completed = true)
            }
            reload++
        },
        onOpenFamily = onOpenFamily,
        onAck = { e ->
            scope.launch {
                runCatching {
                    FamilyRepository.ack(context, e.id)
                    runCatching { Signal.valueOf(e.signal) }.getOrNull()?.let {
                        AlertFeedbackReceiver.record(context, Detection(it), FeedbackResponse.CONTACTED, guardian = true)
                    }
                    Notifications.emergencyClosed(context, e.id, "확인했다고 알렸어요", "다른 보호자에게 가는 연락은 멈췄어요.")
                }.onFailure { ui = ui.copy(error = "확인을 보내지 못했어요. 인터넷을 확인해 주세요.") }
                reload++
            }
        },
        onCall = { number -> context.startActivity(Intent(Intent.ACTION_DIAL, "tel:$number".toUri())) },
        onAlertFeedback = { signal, response ->
            runCatching { Signal.valueOf(signal) }.getOrNull()?.let { AlertFeedbackReceiver.record(context, Detection(it), response, guardian = true) }
        },
        onOpenSettings = onOpenSettings,
    )
}

/** 쉽게 보기 홈: 보호자 전화와 폰 SOS를 함께 둡니다. */
@Composable
private fun EasyHome(
    store: AppStore,
    state: HomeState,
    onComplete: () -> Unit,
    onFeeling: (Int) -> Unit,
    feedback: Map<Signal, FeedbackResponse>,
    onAlertFeedback: (Detection, FeedbackResponse) -> Unit,
    onOpenSettings: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var guardian by remember { mutableStateOf<Pair<String, String>?>(null) }
    var sos by remember { mutableStateOf<PhoneSos?>(null) }
    LaunchedEffect(Unit) {
        // 1순위 보호자 중 전화번호가 있는 사람.
        guardian = runCatching { FamilyRepository.family(context) }.getOrNull()
            ?.guardians?.sortedBy { it.priority }?.firstNotNullOfOrNull { g -> g.person.phone?.let { g.person.name to it } }
    }
    EasyHomeContent(
        state = state,
        onCompleteMission = onComplete,
        onFeeling = onFeeling,
        guardian = guardian,
        onCall = { number -> context.startActivity(Intent(Intent.ACTION_DIAL, "tel:$number".toUri())) },
        onSos = { sos = PhoneSos.Countdown },
        alertFeedback = feedback,
        onAlertFeedback = onAlertFeedback,
        onOpenSettings = onOpenSettings,
    )
    sos?.let { current ->
        PhoneSosDialog(
            state = current,
            onSend = {
                sos = PhoneSos.Sending
                scope.launch {
                    val result = withContext(Dispatchers.IO) { FamilyRepository.sos(context) }
                    Metrics.track(context, EventName.ALERT_SENT, mapOf("signal" to "SOS", "recipient" to "guardian"))
                    Notifications.sos(context, result)
                    val (title, detail) = WatchContract.sosText(FamilyRepository.sosCode(result))
                    val sentId = (result as? SosResult.Sent)?.takeIf { it.guardians > 0 }?.emergencyId
                    // 폰에서는 이 창에 취소 버튼이 있으니 그걸 안내합니다.
                    sos = PhoneSos.Done(title, if (sentId != null) "괜찮으면 \"괜찮아요, 취소\"를 눌러 주세요. 위급하면 119에 전화하세요." else detail, sentId)
                }
            },
            onCancel = { sos = null },
            onCancelSent = { id ->
                scope.launch {
                    if (runCatching { FamilyRepository.cancel(context, id) }.isSuccess) {
                        Notifications.cancelSos(context)
                        sos = null
                    } else {
                        // 취소가 안 됐으면 보호자는 아직 긴급 알림을 받고 있으니 창을 닫지 않고 알립니다.
                        (sos as? PhoneSos.Done)?.let { sos = it.copy(detail = "취소하지 못했어요. 인터넷을 확인하고 다시 눌러 주시거나 보호자에게 직접 전화해 주세요.") }
                    }
                }
            },
            onCall119 = { context.startActivity(Intent(Intent.ACTION_DIAL, "tel:119".toUri())) },
        )
    }
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
    var exporting by remember { mutableStateOf(false) }
    var exportBusy by remember { mutableStateOf(false) }
    var exportError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    HistoryContent(
        history, period, onPeriod = { period = it }, selected = selected, onSelect = { selected = it }, onOpenSettings = onOpenSettings,
        onExport = {
            exportError = null
            exporting = true
        },
    )
    if (exporting) {
        ExportDialog(exportBusy, exportError, onDismiss = { exporting = false }) { days, name ->
            exportBusy = true
            scope.launch {
                runCatching { ClinicExport.create(context, days, name.ifEmpty { null }) }
                    .onSuccess {
                        ClinicExport.share(context, it, days)
                        exporting = false
                    }
                    .onFailure { exportError = "만들지 못했어요. Health Connect 권한을 확인해 주세요." }
                exportBusy = false
            }
        }
    }
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
