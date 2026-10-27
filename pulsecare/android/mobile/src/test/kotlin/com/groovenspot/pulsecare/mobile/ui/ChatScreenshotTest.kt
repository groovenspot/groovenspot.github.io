package com.groovenspot.pulsecare.mobile.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.groovenspot.pulsecare.mobile.chat.ChatMessage
import com.groovenspot.pulsecare.mobile.chat.ChatRepository
import org.junit.Rule
import org.junit.Test

/** AI 상담 화면 (예시 대화). */
class ChatScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6, theme = "android:Theme.Material.Light.NoActionBar", useDeviceResolution = true)

    private fun render(ui: ChatUi) = paparazzi.snapshot { PulseTheme { ChatContent(ui, ChatRepository.SUGGESTIONS, onAgree = {}, onSend = {}, onBack = {}) } }

    @Test
    fun notice() = render(ChatUi(configured = true, consented = false))

    @Test
    fun conversation() = render(
        ChatUi(
            configured = true,
            consented = true,
            remaining = 28,
            messages = listOf(
                ChatMessage(true, "오늘 점수가 왜 이렇게 나왔어요?"),
                ChatMessage(false, "어젯밤 수면이 평소보다 1시간 짧았고 HRV도 조금 낮았어요. 점수는 내 평소와 비교한 값이라 하루 낮은 건 흔해요. 오늘은 강한 운동 대신 15분 산책을 하고 30분 일찍 누워 보세요."),
                ChatMessage(true, "요즘 너무 힘들어서 죽고 싶어요"),
                ChatMessage(false, "많이 힘드셨겠어요. 지금 이 마음을 혼자 견디지 않으셔도 돼요.\n· 자살예방상담전화 109 (24시간)\n· 정신건강위기상담 1577-0199\n· 위급하면 119", crisis = true),
            ),
        ),
    )
}
