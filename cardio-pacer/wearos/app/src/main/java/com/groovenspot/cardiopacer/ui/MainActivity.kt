package com.groovenspot.cardiopacer.ui

import android.Manifest
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.groovenspot.cardiopacer.data.ZoneSettings
import com.groovenspot.cardiopacer.exercise.ExerciseRepository
import com.groovenspot.cardiopacer.exercise.ExerciseService
import com.groovenspot.cardiopacer.exercise.WorkoutActivity
import com.groovenspot.cardiopacer.zone.ZoneProfile

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CardioPacerTheme {
                CardioPacerApp(
                    keepScreenOn = { on ->
                        if (on) {
                            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        } else {
                            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        }
                    },
                )
            }
        }
    }
}

/** Heart rate permission: granular health permission on API 36+, body sensors before that. */
private val heartRatePermission: String =
    if (Build.VERSION.SDK_INT >= 36) "android.permission.health.READ_HEART_RATE" else Manifest.permission.BODY_SENSORS

private val requiredPermissions: Array<String>
    get() = buildList {
        add(heartRatePermission)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) add(Manifest.permission.POST_NOTIFICATIONS)
    }.toTypedArray()

@Composable
fun CardioPacerApp(keepScreenOn: (Boolean) -> Unit) {
    val context = LocalContext.current
    val settings = remember { ZoneSettings.get(context) }
    val profile by settings.profile.collectAsStateWithLifecycle()
    val exercise by ExerciseRepository.state.collectAsStateWithLifecycle()
    var permissionDenied by remember { mutableStateOf(false) }
    var pendingActivity by remember { mutableStateOf<WorkoutActivity?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        val activity = pendingActivity
        pendingActivity = null
        if (result[heartRatePermission] == true && activity != null) {
            permissionDenied = false
            ExerciseService.start(context, activity, settings.zone2Range)
        } else {
            permissionDenied = true
        }
    }

    LaunchedEffect(exercise.isSessionActive) { keepScreenOn(exercise.isSessionActive) }

    val summary = exercise.summary
    when {
        summary != null -> SummaryScreen(summary = summary, onDone = ExerciseRepository::reset)
        exercise.isSessionActive -> ExerciseScreen(
            state = exercise,
            onPause = { ExerciseService.pause(context) },
            onResume = { ExerciseService.resume(context) },
            onEnd = { ExerciseService.end(context) },
        )
        profile == null -> SettingsScreen(
            initial = ZoneProfile.DEFAULT,
            isOnboarding = true,
            onSave = settings::save,
        )
        else -> {
            val navController = rememberSwipeDismissableNavController()
            SwipeDismissableNavHost(navController = navController, startDestination = "start") {
                composable("start") {
                    StartScreen(
                        range = settings.zone2Range,
                        initialActivity = exercise.activity,
                        error = exercise.error ?: if (permissionDenied) "심박수 센서 권한이 필요합니다" else null,
                        onStart = { activity ->
                            ExerciseRepository.clearError()
                            pendingActivity = activity
                            permissionLauncher.launch(requiredPermissions)
                        },
                        onOpenSettings = { navController.navigate("settings") },
                    )
                }
                composable("settings") {
                    SettingsScreen(
                        initial = profile ?: ZoneProfile.DEFAULT,
                        isOnboarding = false,
                        onSave = {
                            settings.save(it)
                            navController.popBackStack()
                        },
                    )
                }
            }
        }
    }
}
