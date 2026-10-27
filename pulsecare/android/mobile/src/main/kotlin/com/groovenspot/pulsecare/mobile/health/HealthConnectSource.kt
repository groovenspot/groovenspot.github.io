package com.groovenspot.pulsecare.mobile.health

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.FloorsClimbedRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.RespiratoryRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByDurationRequest
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.groovenspot.pulsecare.mission.ExerciseKind
import java.time.Duration
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId
import kotlin.reflect.KClass

/**
 * Health Connect에서 점수에 필요한 값만 읽습니다. 워치 브랜드와 무관하게 갤럭시 워치(삼성 헬스),
 * 픽셀 워치(Fitbit), 가민 등이 Health Connect에 쓴 기록을 그대로 씁니다.
 */
object HealthConnectSource {
    private const val TAG = "HealthConnectSource"

    /** 꼭 필요한 권한. 수면이 없으면 점수를 낼 수 없습니다. */
    val required: Set<String> = setOf(HealthPermission.getReadPermission(SleepSessionRecord::class))

    val all: Set<String> = setOf(
        SleepSessionRecord::class,
        HeartRateVariabilityRmssdRecord::class,
        RestingHeartRateRecord::class,
        StepsRecord::class,
        ActiveCaloriesBurnedRecord::class,
        RespiratoryRateRecord::class,
        OxygenSaturationRecord::class,
        // 미션 자동 확인 (기획서 14번): 계단, 운동 기록
        FloorsClimbedRecord::class,
        ExerciseSessionRecord::class,
    ).map { HealthPermission.getReadPermission(it) }.toSet()

    /** 아침 7:30 알림을 앱을 열지 않고 계산하려면 백그라운드 읽기 권한이 필요합니다. */
    const val BACKGROUND = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND

    /** 이 휴대폰의 Health Connect가 백그라운드 읽기를 지원하면 함께 요청합니다. */
    fun requestable(context: Context): Set<String> =
        if (backgroundSupported(context)) all + BACKGROUND else all

    fun backgroundSupported(context: Context): Boolean = isAvailable(context) &&
        HealthConnectClient.getOrCreate(context).features
            .getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) ==
        HealthConnectFeatures.FEATURE_STATUS_AVAILABLE

    fun isAvailable(context: Context): Boolean =
        HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    suspend fun granted(context: Context): Set<String> =
        if (!isAvailable(context)) emptySet()
        else HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions()

    /** [from]~[to] 기상일의 기록. 권한이 없는 항목은 비워 둡니다 (SYS-03: 가능한 데이터로만 동작). */
    suspend fun read(context: Context, from: LocalDate, to: LocalDate, zone: ZoneId): RawHealth {
        val client = HealthConnectClient.getOrCreate(context)
        val granted = client.permissionController.getGrantedPermissions()
        // 전날 저녁에 시작한 수면과 전날 활동까지 들어오게 하루 앞에서 읽습니다.
        val range = TimeRangeFilter.between(
            from.minusDays(1).atStartOfDay(zone).toInstant(),
            to.plusDays(1).atStartOfDay(zone).toInstant(),
        )

        suspend fun <T : Record> records(type: KClass<T>): List<T> {
            if (HealthPermission.getReadPermission(type) !in granted) return emptyList()
            return runCatching {
                buildList {
                    var token: String? = null
                    do {
                        val response = client.readRecords(ReadRecordsRequest(type, range, pageToken = token))
                        addAll(response.records)
                        token = response.pageToken
                    } while (token != null)
                }
            }.onFailure { Log.w(TAG, "Couldn't read ${type.simpleName}", it) }.getOrDefault(emptyList())
        }

        val dayRange = TimeRangeFilter.between(from.minusDays(1).atStartOfDay(), to.plusDays(1).atStartOfDay())
        suspend fun daily(permission: KClass<out Record>, read: suspend () -> Map<LocalDate, Double>): Map<LocalDate, Double> {
            if (HealthPermission.getReadPermission(permission) !in granted) return emptyMap()
            return runCatching { read() }.onFailure { Log.w(TAG, "Couldn't aggregate", it) }.getOrDefault(emptyMap())
        }

        // 시간별 걸음은 미션 확인에만 쓰니 어제·오늘만.
        val recent = TimeRangeFilter.between(to.minusDays(1).atStartOfDay(zone).toInstant(), to.plusDays(1).atStartOfDay(zone).toInstant())
        val hourly = if (HealthPermission.getReadPermission(StepsRecord::class) !in granted) emptyMap() else runCatching {
            client.aggregateGroupByDuration(
                AggregateGroupByDurationRequest(setOf(StepsRecord.COUNT_TOTAL), recent, Duration.ofHours(1)),
            ).associate { it.startTime.atZone(zone).toLocalDateTime() to (it.result[StepsRecord.COUNT_TOTAL] ?: 0L) }
        }.onFailure { Log.w(TAG, "Couldn't aggregate hourly steps", it) }.getOrDefault(emptyMap())

        return RawHealth(
            sleep = records(SleepSessionRecord::class).map { s ->
                RawSleep(s.startTime, s.endTime, s.stages.map { RawStage(it.startTime, it.endTime, stageType(it.stage)) })
            },
            hrv = records(HeartRateVariabilityRmssdRecord::class).map { Sample(it.time, it.heartRateVariabilityMillis) },
            restingHr = records(RestingHeartRateRecord::class).map { Sample(it.time, it.beatsPerMinute.toDouble()) },
            respiratoryRate = records(RespiratoryRateRecord::class).map { Sample(it.time, it.rate) },
            spo2 = records(OxygenSaturationRecord::class).map { Sample(it.time, it.percentage.value) },
            steps = daily(StepsRecord::class) {
                client.aggregateGroupByPeriod(
                    AggregateGroupByPeriodRequest(setOf(StepsRecord.COUNT_TOTAL), dayRange, Period.ofDays(1)),
                ).associate { it.startTime.toLocalDate() to (it.result[StepsRecord.COUNT_TOTAL] ?: 0L).toDouble() }
            }.mapValues { it.value.toLong() },
            activeCalories = daily(ActiveCaloriesBurnedRecord::class) {
                client.aggregateGroupByPeriod(
                    AggregateGroupByPeriodRequest(setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL), dayRange, Period.ofDays(1)),
                ).associate {
                    it.startTime.toLocalDate() to (it.result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0)
                }
            },
            stepsByHour = hourly,
            floors = daily(FloorsClimbedRecord::class) {
                client.aggregateGroupByPeriod(
                    AggregateGroupByPeriodRequest(setOf(FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL), dayRange, Period.ofDays(1)),
                ).associate { it.startTime.toLocalDate() to (it.result[FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL] ?: 0.0) }
            },
            exercises = records(ExerciseSessionRecord::class).map { RawExercise(it.startTime, it.endTime, exerciseKind(it.exerciseType)) },
        )
    }

    private fun exerciseKind(type: Int): ExerciseKind = when (type) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL,
        ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING,
        ExerciseSessionRecord.EXERCISE_TYPE_BOXING,
        ExerciseSessionRecord.EXERCISE_TYPE_MARTIAL_ARTS,
        ExerciseSessionRecord.EXERCISE_TYPE_SQUASH,
        ExerciseSessionRecord.EXERCISE_TYPE_SOCCER,
        ExerciseSessionRecord.EXERCISE_TYPE_BASKETBALL,
        -> ExerciseKind.VIGOROUS
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING,
        ExerciseSessionRecord.EXERCISE_TYPE_HIKING,
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY,
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL,
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER,
        ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL,
        ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE,
        ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING,
        ExerciseSessionRecord.EXERCISE_TYPE_DANCING,
        -> ExerciseKind.CARDIO
        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
        ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING,
        ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS,
        -> ExerciseKind.STRENGTH
        ExerciseSessionRecord.EXERCISE_TYPE_STRETCHING,
        ExerciseSessionRecord.EXERCISE_TYPE_YOGA,
        ExerciseSessionRecord.EXERCISE_TYPE_PILATES,
        -> ExerciseKind.STRETCH
        else -> ExerciseKind.OTHER
    }

    private fun stageType(stage: Int): StageType = when (stage) {
        SleepSessionRecord.STAGE_TYPE_AWAKE, SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> StageType.AWAKE
        SleepSessionRecord.STAGE_TYPE_LIGHT -> StageType.LIGHT
        SleepSessionRecord.STAGE_TYPE_DEEP -> StageType.DEEP
        SleepSessionRecord.STAGE_TYPE_REM -> StageType.REM
        SleepSessionRecord.STAGE_TYPE_SLEEPING -> StageType.ASLEEP_UNKNOWN
        SleepSessionRecord.STAGE_TYPE_OUT_OF_BED -> StageType.OUT_OF_BED
        else -> StageType.OTHER
    }
}
