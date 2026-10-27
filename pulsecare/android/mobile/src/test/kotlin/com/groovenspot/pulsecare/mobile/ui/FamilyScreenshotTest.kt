package com.groovenspot.pulsecare.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.mobile.family.AlertView
import com.groovenspot.pulsecare.mobile.family.DaySummary
import com.groovenspot.pulsecare.mobile.family.EmergencyView
import com.groovenspot.pulsecare.mobile.family.Family
import com.groovenspot.pulsecare.mobile.family.GuardianView
import com.groovenspot.pulsecare.mobile.family.Invite
import com.groovenspot.pulsecare.mobile.family.Person
import com.groovenspot.pulsecare.mobile.family.WearerView
import org.junit.Rule
import org.junit.Test
import java.time.Instant

/** 가족 탭을 예시 데이터로 그립니다 (화면 확인용). 이름·수치는 예시입니다. */
class FamilyScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6.copy(screenHeight = 3600),
        theme = "android:Theme.Material.Light.NoActionBar",
        useDeviceResolution = true,
    )

    private val now = Instant.parse("2027-06-16T01:00:00Z")
    private val me = Person("me", "민지", "01011112222")
    private val mom = Person("mom", "엄마", "01012345678")

    private fun render(ui: FamilyUi) = paparazzi.snapshot {
        PulseTheme {
            MainTabs(Tab.FAMILY, onTab = {}) {
                FamilyContent(
                    ui, onStart = { _, _ -> }, onInvite = {}, onShareInvite = { _, _ -> }, onCheckCode = {}, onAccept = {},
                    onDismissAccept = {}, onUnlink = {}, onMove = { _, _ -> }, onAck = {}, onCall = {}, onReload = {},
                )
            }
        }
    }

    /** 보호자 화면: 엄마가 SOS를 눌렀고, 오늘 요약에 걸음 수 감소. */
    @Test
    fun guardianWithEmergency() = render(
        FamilyUi(
            configured = true,
            pushConfigured = true,
            me = me,
            now = now,
            family = Family(
                guardians = emptyList(),
                wearers = listOf(
                    WearerView(
                        mom,
                        DaySummary(
                            "2027-06-16", 58, "FAIR", "가벼운 산책 15분", missionDone = false,
                            alerts = listOf(AlertView("ACTIVITY_DROP", "엄마 걸음 수 감소", "엄마의 걸음 수가 3일째 평소의 45% 수준이에요. 안부 전화를 드려보세요.")),
                        ),
                        listOf(EmergencyView("e1", "mom", "SOS", now.minusSeconds(120).toEpochMilli(), "ACTIVE", "[긴급] 엄마 SOS", "[긴급] 엄마가 도움을 요청했어요.", null)),
                    ),
                ),
            ),
        ),
    )

    /** 착용자 화면: 보호자 두 명, 방금 만든 초대 코드. */
    @Test
    fun wearerWithGuardians() = render(
        FamilyUi(
            configured = true,
            pushConfigured = false,
            me = mom,
            now = now,
            family = Family(listOf(GuardianView(me, 1), GuardianView(Person("son", "민수", null), 2)), emptyList()),
            invite = "WEARER" to Invite("K7Q2M9XA", now.toEpochMilli()),
        ),
    )

    /** 워치 없는 보호자의 "부모님" 탭. */
    @Test
    fun guardianHome() = paparazzi.snapshot {
        PulseTheme {
            MainTabs(Tab.TODAY, onTab = {}, tabs = listOf(Tab.TODAY, Tab.FAMILY), label = { if (it == Tab.TODAY) "부모님" else it.label }) {
                GuardianHomeContent(
                    date = java.time.LocalDate.of(2027, 6, 16),
                    ui = FamilyUi(
                        configured = true, pushConfigured = true, me = me, now = now,
                        family = Family(
                            emptyList(),
                            listOf(
                                WearerView(mom, DaySummary("2027-06-16", 74, "GOOD", "가벼운 산책 15분", missionDone = true, alerts = emptyList()), emptyList()),
                                WearerView(Person("dad", "아빠", null), null, emptyList()),
                            ),
                        ),
                    ),
                    mission = com.groovenspot.pulsecare.mission.MissionLibrary["P-02"],
                    missionDone = false,
                    onCompleteMission = {}, onOpenFamily = {}, onAck = {}, onCall = {}, onAlertFeedback = { _, _ -> }, onOpenSettings = {},
                )
            }
        }
    }

    @Test
    fun guardianHomeEmpty() = paparazzi.snapshot {
        PulseTheme {
            GuardianHomeContent(
                date = java.time.LocalDate.of(2027, 6, 16),
                ui = FamilyUi(configured = true, pushConfigured = true, me = null),
                mission = com.groovenspot.pulsecare.mission.MissionLibrary["P-01"],
                missionDone = false,
                onCompleteMission = {}, onOpenFamily = {}, onAck = {}, onCall = {}, onAlertFeedback = { _, _ -> }, onOpenSettings = {},
            )
        }
    }

    @Test
    fun transferCode() = render(
        FamilyUi(configured = true, pushConfigured = true, me = mom, now = now, family = Family(emptyList(), emptyList()), transfer = Invite("K7Q2M9XAB4", now.toEpochMilli())),
    )

    @Test
    fun start() = render(FamilyUi(configured = true, pushConfigured = true, me = null))
}
