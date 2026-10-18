package com.groovenspot.cardiopacer.mobile.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.groovenspot.cardiopacer.mobile.data.PhoneStore
import com.groovenspot.cardiopacer.mobile.health.HealthConnectWriter
import com.groovenspot.cardiopacer.sync.WorkoutRecord
import com.groovenspot.cardiopacer.zone.DurationFormatter
import com.groovenspot.cardiopacer.zone.HeartRateZone
import com.groovenspot.cardiopacer.zone.ZoneProfile
import com.groovenspot.cardiopacer.zone.ZoneRange
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object PhoneColors {
    val Blue = Color(0xFF1F73F2)
    val Green = Color(0xFF1CB354)
    val Red = Color(0xFFE62E2E)
    val Track = Color(0xFF2A332D)
}

val HeartRateZone.color: Color
    get() = when (this) {
        HeartRateZone.BELOW -> PhoneColors.Blue
        HeartRateZone.TARGET -> PhoneColors.Green
        HeartRateZone.ABOVE -> PhoneColors.Red
    }

@Composable
fun PhoneTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = PhoneColors.Green,
            onPrimary = Color.Black,
            secondaryContainer = Color(0xFF1E3A28),
            onSecondaryContainer = Color.White,
            background = Color(0xFF0B0F0C),
            surface = Color(0xFF0B0F0C),
            surfaceContainerHighest = Color(0xFF1A221D),
        ),
        content = content,
    )
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { PhoneTheme { CompanionScreen() } }
    }
}

@Composable
fun CompanionScreen() {
    val context = LocalContext.current
    val store = remember { PhoneStore.get(context) }
    val profile by store.profile.collectAsStateWithLifecycle()
    val history by store.history.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    var healthConnectGranted by remember { mutableStateOf(false) }
    val healthConnectAvailable = remember { HealthConnectWriter.isAvailable(context) }
    val permissionLauncher = rememberLauncherForActivityResult(
        PermissionController.createRequestPermissionResultContract(),
    ) { granted ->
        healthConnectGranted = granted.containsAll(HealthConnectWriter.permissions)
        if (healthConnectGranted) scope.launch { HealthConnectWriter.syncPending(context) }
    }
    LaunchedEffect(Unit) {
        healthConnectGranted = HealthConnectWriter.hasPermission(context)
        HealthConnectWriter.syncPending(context)
    }

    CompanionContent(
        profile = profile,
        history = history,
        healthConnectAvailable = healthConnectAvailable,
        healthConnectGranted = healthConnectGranted,
        onSaveProfile = store::saveProfile,
        onRequestHealthConnect = { permissionLauncher.launch(HealthConnectWriter.permissions) },
    )
}

/** Stateless screen content, so it can also be rendered for store screenshots. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompanionContent(
    profile: ZoneProfile?,
    history: List<WorkoutRecord>,
    healthConnectAvailable: Boolean,
    healthConnectGranted: Boolean,
    onSaveProfile: (ZoneProfile) -> Unit,
    onRequestHealthConnect: () -> Unit,
) {
    Scaffold(topBar = { TopAppBar(title = { Text("Cardio Pacer", fontWeight = FontWeight.Bold) }) }) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = padding.calculateTopPadding(), bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item {
                ZoneSettingsCard(
                    initial = profile ?: ZoneProfile.DEFAULT,
                    onSave = onSaveProfile,
                )
            }
            item {
                HealthConnectCard(
                    available = healthConnectAvailable,
                    granted = healthConnectGranted,
                    onRequest = onRequestHealthConnect,
                )
            }
            item {
                Text("운동 기록", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
            }
            if (history.isEmpty()) {
                item {
                    Text(
                        "워치에서 운동을 마치면 여기에 Zone 2 달성률이 쌓입니다.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            items(history, key = WorkoutRecord::id) { WorkoutRow(it) }
            item {
                Text(
                    "Cardio Pacer는 의료기기가 아니며, 계산된 구간은 일반적인 공식에 따른 참고값입니다. " +
                        "심장 질환이 있거나 약을 복용 중이라면 운동 전 의사와 상담하세요.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 16.dp),
                )
            }
        }
    }
}

@Composable
private fun ZoneSettingsCard(initial: ZoneProfile, onSave: (ZoneProfile) -> Unit) {
    // Re-seed the form whenever the saved profile changes (e.g. edited on the watch).
    var manual by remember(initial) { mutableStateOf(initial.method == ZoneProfile.Method.MANUAL) }
    var age by remember(initial) { mutableIntStateOf(initial.age) }
    var useResting by remember(initial) { mutableStateOf(initial.restingHeartRate != null) }
    var resting by remember(initial) { mutableIntStateOf(initial.restingHeartRate ?: 60) }
    var lower by remember(initial) { mutableIntStateOf(initial.manualRange?.lower ?: 130) }
    var upper by remember(initial) { mutableIntStateOf(initial.manualRange?.upper ?: 145) }
    var saved by remember(initial) { mutableStateOf(false) }

    val draft = ZoneProfile(
        age = age,
        restingHeartRate = if (useResting) resting else null,
        maxHeartRateOverride = initial.maxHeartRateOverride,
        method = if (manual) ZoneProfile.Method.MANUAL else ZoneProfile.Method.AUTOMATIC,
        manualRange = ZoneRange.of(lower, upper),
    )

    Card(shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("목표 ZONE 2", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                "${draft.zone2Range.label} BPM",
                fontSize = 36.sp,
                fontWeight = FontWeight.Black,
                color = PhoneColors.Green,
            )

            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                listOf(false to "자동 계산", true to "직접 입력").forEachIndexed { index, (isManual, label) ->
                    SegmentedButton(
                        selected = manual == isManual,
                        onClick = { manual = isManual },
                        shape = SegmentedButtonDefaults.itemShape(index, 2),
                    ) { Text(label) }
                }
            }

            if (!manual) {
                Stepper("나이", age, 10..90, "세") { age = it }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("안정 시 심박수 사용", Modifier.weight(1f))
                    Switch(checked = useResting, onCheckedChange = { useResting = it })
                }
                if (useResting) Stepper("안정 시 심박수", resting, 35..100, " BPM") { resting = it }
                Text(
                    if (useResting) {
                        "최대 심박수 ${draft.estimatedMaxHeartRate} BPM 기준, 여유 심박수의 60~70% (Karvonen)"
                    } else {
                        "최대 심박수 ${draft.estimatedMaxHeartRate} BPM의 60~70%"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Stepper("하한", lower, 80..200, " BPM") {
                    lower = it
                    if (upper <= lower) upper = lower + 1
                }
                Stepper("상한", upper, (lower + 1)..210, " BPM") { upper = it }
            }

            Button(
                onClick = {
                    onSave(draft)
                    saved = true
                },
                enabled = draft != initial || !saved,
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (saved && draft == initial) "워치로 보냈어요" else "저장하고 워치로 보내기") }
        }
    }
}

@Composable
private fun Stepper(label: String, value: Int, range: IntRange, suffix: String, onChange: (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(label, Modifier.weight(1f))
        FilledTonalIconButton(onClick = { onChange((value - 1).coerceIn(range)) }) { Text("−", fontWeight = FontWeight.Bold) }
        Text("$value$suffix", fontWeight = FontWeight.Bold, modifier = Modifier.width(76.dp), textAlign = TextAlign.Center)
        FilledTonalIconButton(onClick = { onChange((value + 1).coerceIn(range)) }) { Text("+", fontWeight = FontWeight.Bold) }
    }
}

@Composable
private fun HealthConnectCard(available: Boolean, granted: Boolean, onRequest: () -> Unit) {
    Card(shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Health Connect", style = MaterialTheme.typography.titleMedium)
            Text(
                when {
                    !available -> "이 기기에서는 Health Connect를 사용할 수 없어요. 운동 기록은 이 앱에만 저장됩니다."
                    granted -> "워치 운동이 Health Connect에 자동으로 저장됩니다."
                    else -> "허용하면 워치 운동을 Health Connect에 저장해 다른 건강 앱에서도 볼 수 있어요."
                },
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (available && !granted) {
                OutlinedButton(onClick = onRequest, colors = ButtonDefaults.outlinedButtonColors(contentColor = PhoneColors.Green)) {
                    Text("Health Connect 연결")
                }
            }
        }
    }
}

private val dateFormat = SimpleDateFormat("M월 d일 (E) HH:mm", Locale.KOREAN)

private fun activityTitle(name: String) = when (name) {
    "CYCLING" -> "사이클"
    "WALKING" -> "빠르게 걷기"
    else -> "러닝"
}

@Composable
private fun WorkoutRow(record: WorkoutRecord) {
    val summary = record.summary
    Card(shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(dateFormat.format(Date(record.startEpochMillis)), fontWeight = FontWeight.SemiBold)
                    Text(
                        "${activityTitle(record.activity)} · ${DurationFormatter.clock(summary.durationMillis)}" +
                            (summary.averageHeartRate?.let { " · 평균 %.0f BPM".format(it) } ?: ""),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text("${summary.zone2Percent}%", fontSize = 26.sp, fontWeight = FontWeight.Black, color = PhoneColors.Green)
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(PhoneColors.Track),
            ) {
                HeartRateZone.entries.forEach { zone ->
                    val fraction = summary.fraction(zone).toFloat()
                    if (fraction > 0f) Box(Modifier.weight(fraction).fillMaxHeight().background(zone.color))
                }
            }
        }
    }
}
