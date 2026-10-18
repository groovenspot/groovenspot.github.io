package com.groovenspot.cardiopacer.exercise

import androidx.health.services.client.data.ExerciseType
import com.groovenspot.cardiopacer.zone.HeartRateZone
import com.groovenspot.cardiopacer.zone.WorkoutSummary
import com.groovenspot.cardiopacer.zone.ZoneProfile
import com.groovenspot.cardiopacer.zone.ZoneRange
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class WorkoutActivity(val title: String, val exerciseType: ExerciseType) {
    RUNNING("러닝", ExerciseType.RUNNING),
    CYCLING("사이클", ExerciseType.BIKING),
    WALKING("빠르게 걷기", ExerciseType.WALKING),
}

enum class Phase { IDLE, STARTING, RUNNING, PAUSED, ENDING, ENDED }

/**
 * Health Services reports active duration as a checkpoint; the live value is
 * the checkpoint plus wall-clock time since it, while the exercise is running.
 */
data class ActiveDurationCheckpoint(val activeMillis: Long, val atEpochMillis: Long)

data class ExerciseUiState(
    val phase: Phase = Phase.IDLE,
    val activity: WorkoutActivity = WorkoutActivity.RUNNING,
    val range: ZoneRange = ZoneProfile.DEFAULT.zone2Range,
    val heartRate: Double? = null,
    val zone: HeartRateZone? = null,
    val checkpoint: ActiveDurationCheckpoint = ActiveDurationCheckpoint(0, System.currentTimeMillis()),
    val summary: WorkoutSummary? = null,
    val error: String? = null,
) {
    val isSessionActive: Boolean get() = phase != Phase.IDLE

    /** Active (non-paused) workout time at [nowEpochMillis]. */
    fun elapsedMillis(nowEpochMillis: Long = System.currentTimeMillis()): Long =
        if (phase == Phase.RUNNING) {
            checkpoint.activeMillis + (nowEpochMillis - checkpoint.atEpochMillis).coerceAtLeast(0)
        } else {
            checkpoint.activeMillis
        }
}

/** Single source of truth shared by [ExerciseService] and the UI. */
object ExerciseRepository {
    private val _state = MutableStateFlow(ExerciseUiState())
    val state: StateFlow<ExerciseUiState> = _state.asStateFlow()

    internal fun update(transform: (ExerciseUiState) -> ExerciseUiState) = _state.update(transform)

    /** Dismisses the summary (or an error) and returns to the start screen. */
    fun reset() {
        _state.update { ExerciseUiState(activity = it.activity, range = it.range) }
    }

    fun clearError() = _state.update { it.copy(error = null) }
}
