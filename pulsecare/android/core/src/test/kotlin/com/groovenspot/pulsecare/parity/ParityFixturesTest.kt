package com.groovenspot.pulsecare.parity

import com.groovenspot.pulsecare.alert.AlertFeedback
import com.groovenspot.pulsecare.care.Bedtime
import com.groovenspot.pulsecare.care.DoseLog
import com.groovenspot.pulsecare.care.Medication
import com.groovenspot.pulsecare.care.Medications
import com.groovenspot.pulsecare.alert.AlertMessage
import com.groovenspot.pulsecare.alert.AlertScheduler
import com.groovenspot.pulsecare.alert.AlertText
import com.groovenspot.pulsecare.alert.DailySignals
import com.groovenspot.pulsecare.alert.Decision
import com.groovenspot.pulsecare.alert.DeliveryState
import com.groovenspot.pulsecare.alert.Detection
import com.groovenspot.pulsecare.alert.FeedbackEntry
import com.groovenspot.pulsecare.alert.FeedbackResponse
import com.groovenspot.pulsecare.alert.HeartRateWatch
import com.groovenspot.pulsecare.alert.HrSample
import com.groovenspot.pulsecare.alert.PendingAlert
import com.groovenspot.pulsecare.alert.Recipient
import com.groovenspot.pulsecare.alert.Signal
import com.groovenspot.pulsecare.history.HistoryBuilder
import com.groovenspot.pulsecare.history.Period
import com.groovenspot.pulsecare.history.UsualRange
import com.groovenspot.pulsecare.mission.DayActivity
import com.groovenspot.pulsecare.mission.Exercise
import com.groovenspot.pulsecare.mission.ExerciseKind
import com.groovenspot.pulsecare.mission.Goal
import com.groovenspot.pulsecare.mission.MissionLibrary
import com.groovenspot.pulsecare.mission.MissionLog
import com.groovenspot.pulsecare.mission.MissionPicker
import com.groovenspot.pulsecare.mission.MissionVerifier
import com.groovenspot.pulsecare.mission.PickInput
import com.groovenspot.pulsecare.report.ClinicReport
import com.groovenspot.pulsecare.report.Stat
import com.groovenspot.pulsecare.report.WeeklyReport
import com.groovenspot.pulsecare.score.ConditionScoreEngine
import com.groovenspot.pulsecare.score.DailyRecord
import com.groovenspot.pulsecare.score.DayTag
import com.groovenspot.pulsecare.score.Metric
import com.groovenspot.pulsecare.score.PopulationNorms
import com.groovenspot.pulsecare.score.ScoreContext
import com.groovenspot.pulsecare.score.ScoreResult
import com.groovenspot.pulsecare.score.SleepSummary
import org.junit.Assert.fail
import org.junit.Test
import java.io.File
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import kotlin.math.roundToInt
import kotlin.random.Random

/**
 * 아이폰 앱(Swift PulseCore)이 안드로이드와 같은 결과를 내는지 맞춰 보는 사례 묶음.
 * 정해진 씨앗으로 입력을 만들고 Kotlin 결과를 JSON으로 적어 두면, Swift 테스트가 같은 입력으로 다시 계산해 비교합니다.
 *
 * core 로직을 바꿔 결과가 달라지면 이 테스트가 실패합니다. 의도한 변경이면 다시 만들고 Swift도 같이 고치세요:
 * PULSECARE_UPDATE_FIXTURES=1 ./gradlew :core:test --tests '*ParityFixturesTest*'
 */
class ParityFixturesTest {

    private val dir = File("../../ios/PulseCore/Tests/PulseCoreTests/Fixtures")
    private val update = System.getenv("PULSECARE_UPDATE_FIXTURES") == "1"

    @Test
    fun fixturesMatchKotlin() {
        val users = (0 until 8).map { user(it) }
        val files = mapOf(
            "scores.json" to scoreCases(users),
            "picker.json" to pickerCases(),
            "verifier.json" to verifierCases(),
            "heart.json" to heartCases(),
            "scheduler.json" to schedulerCases(),
            "alert_text.json" to alertTextCases(),
            "feedback.json" to feedbackCases(),
            "weekly.json" to weeklyCases(users),
            "history.json" to historyCases(users),
            "clinic.json" to clinicCases(users),
            "care.json" to careCases(),
        )
        val stale = mutableListOf<String>()
        for ((name, cases) in files) {
            val text = cases.joinToString(",\n", "[\n", "\n]\n") { json(it) }
            val file = File(dir, name)
            if (update) {
                file.parentFile.mkdirs()
                file.writeText(text)
            } else if (!file.exists() || file.readText() != text) {
                stale += name
            }
        }
        if (stale.isNotEmpty()) {
            fail("Swift 비교 사례가 Kotlin 결과와 달라요: $stale. PULSECARE_UPDATE_FIXTURES=1 로 다시 만들고 Swift 쪽도 맞추세요.")
        }
    }

    // --- 가상 사용자 ---

    private class User(
        val records: List<DailyRecord>,
        val contexts: List<ScoreContext>,
        val results: List<ScoreResult>,
        val signupDate: LocalDate,
        val logs: List<MissionLog>,
    )

    /** 70일 기록. 사용자마다 빠지는 값, 태그, 기기 교체, 시차, 연속 이상 신호가 다르게 섞입니다. */
    private fun user(seed: Int): User {
        val r = java.util.Random(1000L + seed)
        val start = LocalDate.of(2027, 3, 1).plusDays(seed * 3L)
        val days = 70
        val baseSleep = 400 + r.nextInt(80)
        val baseBed = 22 * 60 + 30 + r.nextInt(90)
        val baseHrv = 35.0 + r.nextInt(30)
        val baseRhr = 52.0 + r.nextInt(14)
        val baseSteps = 5000 + r.nextInt(6000)
        val measuresSpo2 = seed % 2 == 0
        val dayOffset = if (seed % 3 == 0) 0 else 25 // 일부는 가입 후 한참 지난 사람
        val norms = if (seed % 2 == 1) PopulationNorms(45.0, 8.0, 60.0, 4.0) else null
        val deviceChangeAt = if (seed == 3) 40 else null
        val tzChangeAt = if (seed == 4) 50 else null
        val rhrSpike = if (seed == 5) 55..60 else IntRange.EMPTY
        val stepDrop = if (seed == 6) 45..50 else IntRange.EMPTY
        val hrvDrop = if (seed == 7) 28..36 else IntRange.EMPTY
        val shortSleep = if (seed == 2) 60..66 else IntRange.EMPTY

        val records = mutableListOf<DailyRecord>()
        val contexts = mutableListOf<ScoreContext>()
        val results = mutableListOf<ScoreResult>()
        for (i in 0 until days) {
            val date = start.plusDays(i.toLong())
            val worn = r.nextDouble() > 0.06
            var main = (baseSleep + r.nextGaussian() * 40).roundToInt()
            if (r.nextDouble() < 0.04) main = 150 + r.nextInt(80)
            if (i in shortSleep) main = baseSleep - 90 - r.nextInt(30)
            val bed = ((baseBed + r.nextGaussian() * 35).roundToInt() + 24 * 60) % (24 * 60)
            val sleep = if (!worn) null else SleepSummary(
                mainSleepMinutes = main,
                napMinutes = if (r.nextDouble() < 0.15) 10 + r.nextInt(80) else 0,
                efficiency = if (r.nextDouble() < 0.85) round(0.80 + r.nextDouble() * 0.17, 3) else null,
                deepRatio = if (r.nextDouble() < 0.7) round(0.12 + r.nextDouble() * 0.12, 3) else null,
                bedtime = if (r.nextDouble() < 0.9) LocalTime.of(bed / 60, bed % 60) else null,
            )
            val deviceShift = if (deviceChangeAt != null && i >= deviceChangeAt) 8.0 else 0.0
            val hrv = baseHrv * (1 + r.nextGaussian() * 0.15) + deviceShift - (if (i in hrvDrop) baseHrv * 0.35 else 0.0)
            val rhr = baseRhr + r.nextGaussian() * 2.5 + (if (i in rhrSpike) 13.0 else 0.0)
            val tags = if (r.nextDouble() < 0.08) setOf(DayTag.entries[r.nextInt(3)]) else emptySet()
            val record = DailyRecord(
                date = date,
                sleep = sleep,
                hrvMs = if (worn && (i in hrvDrop || r.nextDouble() < 0.85)) round(hrv, 1) else null,
                restingHr = if (worn && r.nextDouble() < 0.9) round(rhr, 1) else null,
                skinTempC = if (worn && r.nextDouble() < 0.6) round(34.0 + r.nextGaussian() * 0.3, 2) else null,
                respiratoryRate = if (worn && r.nextDouble() < 0.6) round(14.0 + r.nextGaussian() * 0.8, 1) else null,
                activityLoad = if (r.nextDouble() < 0.8) round(100.0 + r.nextGaussian() * 25 + (if (i > 55) 60.0 else 0.0), 1) else null,
                steps = if (r.nextDouble() < 0.9) {
                    ((baseSteps + r.nextGaussian() * 1500) * (if (i in stepDrop) 0.25 else 1.0)).roundToInt().coerceAtLeast(0)
                } else {
                    null
                },
                lowSpo2Repeated = if (measuresSpo2 && worn) r.nextDouble() < 0.12 else null,
                tags = tags,
            )
            val context = ScoreContext(
                dayIndex = i + 1 + dayOffset - (if (seed == 1) 30 else 0),
                cautionSignalActive = r.nextDouble() < 0.05,
                daysSinceDeviceChange = deviceChangeAt?.let { if (i >= it) i - it else null },
                daysSinceTimezoneChange = tzChangeAt?.let { if (i >= it) i - it else null },
                norms = norms,
            )
            val result = ConditionScoreEngine.score(record, records.toList(), context)
            records += record.copy(score = result.score)
            contexts += context
            results += result
        }
        val logs = records.mapNotNull { rec ->
            if (r.nextDouble() < 0.15) return@mapNotNull null
            val m = MissionLibrary.all[r.nextInt(MissionLibrary.all.size)]
            MissionLog(rec.date, m.id, completed = r.nextDouble() < 0.6, auto = r.nextDouble() < 0.4)
        }
        val signup = start.minusDays((dayOffset - (if (seed == 1) 30 else 0)).toLong())
        return User(records, contexts, results, signup, logs)
    }

    private fun scoreCases(users: List<User>): List<Any?> = users.map { u ->
        obj(
            "records" to u.records.map(::rec),
            "logs" to u.logs.map(::log),
            "signupDate" to u.signupDate.toString(),
            "days" to u.records.indices.map { i ->
                val dayIndex = u.contexts[i].dayIndex
                obj(
                    "context" to ctx(u.contexts[i]),
                    "result" to result(u.results[i]),
                    "signals" to DailySignals.evaluate(u.records.subList(0, i + 1), dayIndex).map(::det),
                )
            },
        )
    }

    // --- 미션 ---

    private fun pickerCases(): List<Any?> {
        val r = java.util.Random(7)
        val monday = LocalDate.of(2027, 5, 3)
        return (0 until 400).map {
            val date = monday.plusDays(r.nextInt(14).toLong())
            val history = (1..r.nextInt(12)).map { ago ->
                MissionLog(
                    date.minusDays(ago.toLong()),
                    MissionLibrary.all[r.nextInt(MissionLibrary.all.size)].id,
                    completed = r.nextDouble() < 0.5,
                )
            }
            val input = PickInput(
                date = date,
                score = if (r.nextDouble() < 0.1) null else r.nextInt(101),
                reasonMetric = if (r.nextDouble() < 0.3) null else Metric.entries[r.nextInt(Metric.entries.size)],
                goal = Goal.entries[r.nextInt(4)],
                level = 1 + r.nextInt(3),
                history = history,
                badWeather = r.nextDouble() < 0.2,
                seniorMode = r.nextDouble() < 0.15,
                exclude = if (r.nextDouble() < 0.2) setOf(MissionLibrary.all[r.nextInt(MissionLibrary.all.size)].id) else emptySet(),
            )
            val d = if (r.nextBoolean()) 0.99 else 0.05
            val k = r.nextInt(100)
            val picked = MissionPicker(FixedRandom(d, k)).pick(input)
            obj(
                "date" to input.date.toString(),
                "score" to input.score,
                "reasonMetric" to input.reasonMetric?.name,
                "goal" to input.goal.name,
                "level" to input.level,
                "history" to input.history.map(::log),
                "badWeather" to input.badWeather,
                "seniorMode" to input.seniorMode,
                "exclude" to input.exclude.sorted(),
                "randomDouble" to d,
                "randomInt" to k,
                "expected" to picked.id,
            )
        }
    }

    private class FixedRandom(private val d: Double, private val k: Int) : Random() {
        override fun nextBits(bitCount: Int): Int = 0
        override fun nextDouble(): Double = d
        override fun nextInt(until: Int): Int = k % until
    }

    private fun verifierCases(): List<Any?> {
        val r = java.util.Random(11)
        val base = LocalDate.of(2027, 5, 3)
        return (0 until 150).map {
            val date = base.plusDays(r.nextInt(7).toLong())
            fun t(h: Int) = date.atTime(h, r.nextInt(60))
            val usualBed = LocalTime.of(listOf(22, 23, 0)[r.nextInt(3)], r.nextInt(60))
            val nightBed = if (r.nextDouble() < 0.6) date.plusDays(if (usualBed.hour == 0) 1 else 0).atTime(usualBed).plusMinutes(r.nextInt(120) - 60L) else null
            val a = DayActivity(
                date = date,
                stepsByHour = (0 until 24).filter { r.nextDouble() < 0.4 }.associateWith { (r.nextInt(2500)).toLong() },
                floors = if (r.nextDouble() < 0.5) r.nextInt(6).toDouble() else null,
                exercises = (0 until r.nextInt(3)).map {
                    val s = t(6 + r.nextInt(16))
                    Exercise(s, s.plusMinutes(3L + r.nextInt(50)), ExerciseKind.entries[r.nextInt(ExerciseKind.entries.size)])
                },
                naps = (0 until r.nextInt(2)).map {
                    val s = t(12 + r.nextInt(5))
                    s to s.plusMinutes(5L + r.nextInt(40))
                },
                nightBedtime = nightBed,
                nextWake = nightBed?.plusHours(7),
                morningWake = if (r.nextDouble() < 0.6) date.atTime(6 + r.nextInt(4), r.nextInt(60)) else null,
                usualBedtime = if (r.nextDouble() < 0.85) usualBed else null,
                usualWake = if (r.nextDouble() < 0.85) LocalTime.of(7, r.nextInt(60)) else null,
                recentBedtimes = if (r.nextDouble() < 0.5) (0 until 6 + r.nextInt(3)).map { usualBed.plusMinutes(r.nextInt(80) - 40L) } else emptyList(),
                breathing = (0 until r.nextInt(4)).map { t(6 + r.nextInt(17)) },
                waterCups = r.nextInt(9),
                tagged = r.nextDouble() < 0.3,
            )
            val now = date.atStartOfDay().plusMinutes(r.nextInt(48 * 60).toLong())
            obj(
                "activity" to obj(
                    "date" to a.date.toString(),
                    "stepsByHour" to a.stepsByHour.entries.sortedBy { it.key }.associate { it.key.toString() to it.value.toInt() },
                    "floors" to a.floors,
                    "exercises" to a.exercises.map { obj("start" to dt(it.start), "end" to dt(it.end), "kind" to it.kind.name) },
                    "naps" to a.naps.map { obj("start" to dt(it.first), "end" to dt(it.second)) },
                    "nightBedtime" to a.nightBedtime?.let(::dt),
                    "nextWake" to a.nextWake?.let(::dt),
                    "morningWake" to a.morningWake?.let(::dt),
                    "usualBedtime" to a.usualBedtime?.let(::time),
                    "usualWake" to a.usualWake?.let(::time),
                    "recentBedtimes" to a.recentBedtimes.map(::time),
                    "breathing" to a.breathing.map(::dt),
                    "waterCups" to a.waterCups,
                    "tagged" to a.tagged,
                ),
                "now" to dt(now),
                "expected" to MissionLibrary.all.associate { it.id to MissionVerifier.check(it.id, a, now).name },
            )
        }
    }

    // --- 복약·취침 ---

    private fun careCases(): List<Any?> {
        val r = java.util.Random(29)
        val day = LocalDate.of(2027, 6, 16)
        return (0 until 80).map {
            val plans = (0 until 1 + r.nextInt(3)).map { i ->
                Medication("m$i", "약$i", (0 until 1 + r.nextInt(3)).map { LocalTime.of(6 + r.nextInt(16), listOf(0, 30)[r.nextInt(2)]) }.distinct())
            }
            val logs = plans.flatMap { m -> m.times.filter { r.nextDouble() < 0.5 }.map { t -> DoseLog(day, m.id, t, day.atTime(t).plusMinutes(r.nextInt(90).toLong())) } }
            val now = day.atStartOfDay().plusMinutes(r.nextInt(24 * 60).toLong())
            val doses = Medications.today(plans, logs, now)
            val usual = if (r.nextBoolean()) LocalTime.of(listOf(22, 23, 0, 1)[r.nextInt(4)], r.nextInt(60)) else null
            val fixed = if (r.nextDouble() < 0.3) LocalTime.of(21 + r.nextInt(3), 0) else null
            obj(
                "plans" to plans.map { m -> obj("id" to m.id, "name" to m.name, "times" to m.times.map(::time)) },
                "logs" to logs.map { obj("date" to it.date.toString(), "medicationId" to it.medicationId, "time" to time(it.time), "takenAt" to dt(it.takenAt)) },
                "now" to dt(now),
                "doses" to doses.map { obj("medicationId" to it.medication.id, "time" to time(it.time), "taken" to it.taken, "missed" to it.missed) },
                "missed" to Medications.missed(doses)?.let(::det),
                "next" to Medications.nextEvent(plans, now)?.let(::dt),
                "usualBedtime" to usual?.let(::time),
                "fixedBedtime" to fixed?.let(::time),
                "bedtimeReminder" to time(Bedtime.reminderAt(usual, fixed)),
            )
        }
    }

    // --- 알림 ---

    private fun heartCases(): List<Any?> {
        val r = java.util.Random(13)
        val t0 = Instant.parse("2027-05-03T00:00:00Z")
        return (0 until 120).map {
            var t = t0.plusSeconds(r.nextInt(3600).toLong())
            val level = listOf(35, 60, 125)[r.nextInt(3)]
            val noisy = r.nextBoolean()
            val samples = (0 until 10 + r.nextInt(25)).map {
                t = t.plusSeconds(if (r.nextDouble() < 0.05) 200L else 30L + r.nextInt(60))
                HrSample(
                    time = t,
                    bpm = level + r.nextInt(if (noisy) 20 else 6) - (if (noisy) 8 else 2),
                    moving = noisy && r.nextDouble() < 0.08,
                    asleep = noisy && r.nextDouble() < 0.1,
                    inWorkout = noisy && r.nextDouble() < 0.04,
                )
            }.shuffled(kotlin.random.Random(r.nextInt()))
            obj(
                "samples" to samples.map {
                    obj("time" to it.time.epochSecond, "bpm" to it.bpm, "moving" to it.moving, "asleep" to it.asleep, "inWorkout" to it.inWorkout)
                },
                "expected" to HeartRateWatch.evaluate(samples).map(::det),
            )
        }
    }

    private fun randomDetection(r: java.util.Random, signal: Signal): Detection = Detection(
        signal,
        usual = if (r.nextDouble() < 0.8) round(20 + r.nextDouble() * 500, 1) else null,
        current = if (r.nextDouble() < 0.8) round(20 + r.nextDouble() * 500, 1) else null,
        days = if (r.nextDouble() < 0.8) 1 + r.nextInt(7) else null,
    )

    private fun schedulerCases(): List<Any?> {
        val r = java.util.Random(17)
        val day = LocalDate.of(2027, 5, 3)
        return (0 until 300).map {
            val now = day.atStartOfDay().plusMinutes(r.nextInt(24 * 60).toLong())
            val signal = Signal.entries[r.nextInt(Signal.entries.size)]
            val alert = PendingAlert(randomDetection(r, signal), Recipient.entries[r.nextInt(2)], now)
            val sent = (0 until r.nextInt(4)).map {
                PendingAlert(randomDetection(r, Signal.entries[r.nextInt(Signal.entries.size)]), Recipient.entries[r.nextInt(2)], now.minusHours(1))
            }
            val ack = if (r.nextDouble() < 0.3) mapOf(signal to (now.minusHours(r.nextInt(40).toLong()) to randomDetection(r, signal))) else emptyMap()
            val custom = r.nextDouble() < 0.3
            val settings = if (custom) {
                AlertScheduler.Settings(quietStart = LocalTime.of(r.nextInt(24), 0), quietEnd = LocalTime.of(r.nextInt(24), 30), dailyInfoLimit = 1 + r.nextInt(3))
            } else {
                AlertScheduler.Settings()
            }
            val state = DeliveryState(sentToday = sent, acknowledged = ack, asleep = r.nextDouble() < 0.15)
            val decision = AlertScheduler(settings).decide(alert, now, state)
            obj(
                "alert" to pending(alert),
                "now" to dt(now),
                "sentToday" to sent.map(::pending),
                "acknowledged" to ack.entries.map { obj("at" to dt(it.value.first), "detection" to det(it.value.second)) },
                "asleep" to state.asleep,
                "quietStart" to time(settings.quietStart),
                "quietEnd" to time(settings.quietEnd),
                "dailyInfoLimit" to settings.dailyInfoLimit,
                "expected" to when (decision) {
                    Decision.SendNow -> obj("type" to "now")
                    is Decision.SendAt -> obj("type" to "at", "time" to dt(decision.time), "why" to decision.why)
                    is Decision.Drop -> obj("type" to "drop", "why" to decision.why)
                },
            )
        }
    }

    private fun alertTextCases(): List<Any?> {
        val r = java.util.Random(19)
        val names = listOf("엄마", "아버지", "김철수", "이영희", "Sam", "박민", "")
        return (0 until 150).map {
            val d = randomDetection(r, Signal.entries[r.nextInt(Signal.entries.size)])
            val name = names[r.nextInt(names.size)]
            val location = if (r.nextBoolean()) "서울 마포구" else null
            obj(
                "detection" to det(d),
                "name" to name,
                "location" to location,
                "self" to msg(AlertText.forSelf(d)),
                "guardian" to msg(AlertText.forGuardian(d, name, location)),
                "clinicLabel" to ClinicReport.label(d),
            )
        }
    }

    private fun feedbackCases(): List<Any?> {
        val r = java.util.Random(23)
        val today = LocalDate.of(2027, 5, 20)
        val signals = listOf(Signal.STRESS, Signal.SLEEP_DEBT, Signal.RESTING_HR_RISE, Signal.FALL)
        return (0 until 100).map {
            val entries = (0 until r.nextInt(6)).map {
                FeedbackEntry(
                    today.minusDays(r.nextInt(20).toLong()).atTime(r.nextInt(24), r.nextInt(60)),
                    randomDetection(r, signals[r.nextInt(signals.size)]),
                    FeedbackResponse.entries[r.nextInt(3)],
                )
            }
            val snoozed = signals.filter { r.nextDouble() < 0.2 }.associateWith { today.plusDays(r.nextInt(5) - 2L) }
            val declined = signals.filter { r.nextDouble() < 0.2 }.associateWith { today.minusDays(r.nextInt(10).toLong()).atTime(12, 0) }
            obj(
                "entries" to entries.map { obj("at" to dt(it.at), "detection" to det(it.detection), "response" to it.response.name) },
                "snoozed" to snoozed.entries.associate { it.key.name to it.value.toString() },
                "declined" to declined.entries.associate { it.key.name to dt(it.value) },
                "suggest" to AlertFeedback.suggestSnooze(entries, today, snoozed, declined).map { it.name }.sorted(),
                "acknowledged" to AlertFeedback.acknowledged(entries).entries.sortedBy { it.key }
                    .associate { it.key.name to obj("at" to dt(it.value.first), "detection" to det(it.value.second)) },
                "snoozedNow" to Signal.entries.filter { AlertFeedback.isSnoozed(it, snoozed, today) }.map { it.name },
            )
        }
    }

    // --- 리포트 ---

    private fun weeklyCases(users: List<User>): List<Any?> = users.flatMapIndexed { ui, u ->
        val sundays = u.records.map { it.date }.filter { it.dayOfWeek == DayOfWeek.SUNDAY }.drop(1)
        sundays.flatMap { sunday ->
            listOf(Goal.SLEEP, Goal.WEIGHT, Goal.STRESS, Goal.PARENT).map { goal ->
                val level = 1 + (sunday.dayOfMonth + ui) % 3
                val since = u.records.first().date.plusDays((ui % 2) * 10L)
                val s = WeeklyReport.build(sunday, goal, level, since, u.logs, u.records)
                obj(
                    "user" to ui,
                    "weekEnd" to sunday.toString(),
                    "goal" to goal.name,
                    "level" to level,
                    "goalSince" to since.toString(),
                    "daysDone" to s.daysDone,
                    "badge" to s.badge,
                    "points" to s.points,
                    "levelChange" to s.levelChange.name,
                    "nextLevel" to s.nextLevel,
                    "change" to s.change,
                    "suggestGoalChange" to s.suggestGoalChange,
                    "title" to s.title,
                    "lines" to s.lines,
                )
            }
        }
    }

    private fun historyCases(users: List<User>): List<Any?> = users.flatMapIndexed { ui, u ->
        // 앱이 보여준 점수는 일부 날만 남아 있다고 봅니다 (나머지는 다시 계산).
        val stored = u.records.filterIndexed { i, _ -> i % 3 != 0 }.mapNotNull { r -> r.score?.let { r.date to it } }.toMap()
        val raw = u.records.map { it.copy(score = null) }
        listOf(Period.WEEK, Period.MONTH).flatMap { period ->
            listOf(u.records.last().date, u.records[40].date).map { to ->
                val h = HistoryBuilder.build(period, to, raw, u.signupDate, stored, u.logs)
                obj(
                    "user" to ui,
                    "period" to period.name,
                    "to" to to.toString(),
                    "signupDate" to u.signupDate.toString(),
                    "days" to h.days.map { d ->
                        obj(
                            "date" to d.date.toString(),
                            "dayIndex" to d.dayIndex,
                            "score" to d.score,
                            "band" to d.band?.name,
                            "reason" to d.reason,
                            "learning" to d.learning,
                            "estimated" to d.estimated,
                            "sleepMinutes" to d.sleepMinutes,
                            "missionId" to d.mission?.missionId,
                        )
                    },
                    "averageScore" to h.averageScore,
                    "previousAverage" to h.previousAverage,
                    "averageSleepMinutes" to h.averageSleepMinutes,
                    "sleep" to h.sleep?.let(::range),
                    "hrv" to h.hrv?.let(::range),
                    "restingHr" to h.restingHr?.let(::range),
                    "usualBedtime" to h.usualBedtime?.let(::time),
                    "periodBedtime" to h.periodBedtime?.let(::time),
                    "missionsDone" to h.missionsDone,
                    "missionsAuto" to h.missionsAuto,
                    "weeklyBadges" to h.weeklyBadges.map { it.toString() },
                    "lines" to h.lines,
                )
            }
        }
    }

    private fun clinicCases(users: List<User>): List<Any?> = users.flatMapIndexed { ui, u ->
        val scores = u.records.mapNotNull { r -> r.score?.let { r.date to it } }.toMap()
        val raw = u.records.map { it.copy(score = null) }
        listOf(30L, 13L).map { length ->
            val to = u.records.last().date.minusDays(1)
            val from = to.minusDays(length - 1)
            val c = ClinicReport.build(from, to, raw, u.logs, scores) { (it.toEpochDay() - u.signupDate.toEpochDay() + 1).toInt() }
            obj(
                "user" to ui,
                "from" to from.toString(),
                "to" to to.toString(),
                "signupDate" to u.signupDate.toString(),
                "days" to c.days,
                "sleep" to stat(c.sleep),
                "bedtime" to c.bedtime?.let(::time),
                "shortNights" to c.shortNights,
                "restingHr" to stat(c.restingHr),
                "hrv" to stat(c.hrv),
                "steps" to stat(c.steps),
                "respiratoryRate" to stat(c.respiratoryRate),
                "lowSpo2Nights" to c.lowSpo2Nights,
                "spo2Nights" to c.spo2Nights,
                "signals" to c.signals.map { obj("date" to it.date.toString(), "detection" to det(it.detection)) },
                "missionDays" to c.missionDays,
                "missionLogged" to c.missionLogged,
                "scoreMean" to c.scoreMean,
                "weeks" to c.weeks.map {
                    obj("monday" to it.monday.toString(), "sleepMinutes" to it.sleepMinutes, "restingHr" to it.restingHr, "hrv" to it.hrv, "steps" to it.steps)
                },
            )
        }
    }

    // --- JSON ---

    private fun rec(r: DailyRecord) = obj(
        "date" to r.date.toString(),
        "sleep" to r.sleep?.let {
            obj(
                "mainSleepMinutes" to it.mainSleepMinutes,
                "napMinutes" to it.napMinutes,
                "efficiency" to it.efficiency,
                "deepRatio" to it.deepRatio,
                "bedtime" to it.bedtime?.let(::time),
            )
        },
        "hrvMs" to r.hrvMs,
        "restingHr" to r.restingHr,
        "skinTempC" to r.skinTempC,
        "respiratoryRate" to r.respiratoryRate,
        "activityLoad" to r.activityLoad,
        "steps" to r.steps,
        "lowSpo2Repeated" to r.lowSpo2Repeated,
        "tags" to r.tags.map { it.name }.sorted(),
        "score" to r.score,
    )

    private fun ctx(c: ScoreContext) = obj(
        "dayIndex" to c.dayIndex,
        "cautionSignalActive" to c.cautionSignalActive,
        "daysSinceDeviceChange" to c.daysSinceDeviceChange,
        "daysSinceTimezoneChange" to c.daysSinceTimezoneChange,
        "norms" to c.norms?.let { obj("hrvMedian" to it.hrvMedian, "hrvMad" to it.hrvMad, "restingHrMedian" to it.restingHrMedian, "restingHrMad" to it.restingHrMad) },
    )

    private fun result(s: ScoreResult) = obj(
        "kind" to s.kind.name,
        "score" to s.score,
        "band" to s.band?.name,
        "reason" to s.reason,
        "badges" to s.badges.map { it.name }.sorted(),
        "subScores" to s.subScores.entries.sortedBy { it.key }.associate { it.key.name to it.value },
        "cap" to s.cap?.name,
        "reasonMetric" to s.reasonMetric?.name,
    )

    private fun det(d: Detection) = obj("signal" to d.signal.name, "usual" to d.usual, "current" to d.current, "days" to d.days)
    private fun pending(p: PendingAlert) = obj("detection" to det(p.detection), "recipient" to p.recipient.name, "createdAt" to dt(p.createdAt))
    private fun msg(m: AlertMessage) = obj("title" to m.title, "body" to m.body, "buttons" to m.buttons)
    private fun log(l: MissionLog) = obj("date" to l.date.toString(), "missionId" to l.missionId, "completed" to l.completed, "auto" to l.auto)
    private fun range(u: UsualRange) = obj("low" to u.low, "mid" to u.mid, "high" to u.high)
    private fun stat(s: Stat) = obj(
        "mean" to s.mean, "min" to s.min, "max" to s.max, "days" to s.days, "firstHalf" to s.firstHalf, "secondHalf" to s.secondHalf,
    )

    private fun time(t: LocalTime) = String.format(java.util.Locale.ROOT, "%02d:%02d:%02d", t.hour, t.minute, t.second)
    private fun dt(t: LocalDateTime) = "${t.toLocalDate()}T${time(t.toLocalTime())}"
    private fun round(x: Double, digits: Int): Double {
        val f = Math.pow(10.0, digits.toDouble())
        return Math.round(x * f) / f
    }

    /** 값이 null인 키는 뺍니다 (Swift 쪽은 없으면 nil). */
    private fun obj(vararg pairs: Pair<String, Any?>): Map<String, Any?> = pairs.filter { it.second != null }.toMap()

    private fun json(v: Any?): String = when (v) {
        null -> "null"
        is String -> quote(v)
        is Boolean, is Int, is Long -> v.toString()
        is Double -> {
            require(v.isFinite()) { "JSON에 넣을 수 없는 수: $v" }
            v.toString()
        }
        is Map<*, *> -> v.entries.joinToString(",", "{", "}") { quote(it.key as String) + ":" + json(it.value) }
        is List<*> -> v.joinToString(",", "[", "]") { json(it) }
        else -> error("JSON으로 바꿀 수 없는 값: $v")
    }

    private fun quote(s: String): String = buildString {
        append('"')
        for (c in s) {
            when (c) {
                '"' -> append("\\\"")
                '\\' -> append("\\\\")
                '\n' -> append("\\n")
                else -> if (c < ' ') append(String.format(java.util.Locale.ROOT, "\\u%04x", c.code)) else append(c)
            }
        }
        append('"')
    }
}
