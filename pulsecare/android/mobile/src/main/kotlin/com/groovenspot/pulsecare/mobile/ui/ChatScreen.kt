package com.groovenspot.pulsecare.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.groovenspot.pulsecare.mobile.chat.ChatMessage

/** AI 상담 화면 한 장. 상태만 받아 그립니다. */
data class ChatUi(
    val configured: Boolean,
    val consented: Boolean,
    val messages: List<ChatMessage> = emptyList(),
    val sending: Boolean = false,
    val error: String? = null,
    val remaining: Int? = null,
)

/** 첫 사용 안내 (국외 전송과 한계). 처리방침 "AI 상담"과 같은 내용. */
const val CHAT_NOTICE =
    "질문과 오늘 화면 정보(컨디션 점수·이유·미션)가 답을 만들기 위해 Anthropic(미국)의 AI로 전송돼요. " +
        "펄스케어 서버에는 대화를 저장하지 않고, 화면을 닫으면 대화도 사라져요. 이름·연락처·주민번호는 적지 마세요.\n\n" +
        "AI는 의료진이 아니라 진단이나 약 처방을 하지 않아요. 응급 상황에서는 119에 전화하세요."

@Composable
fun ChatContent(
    ui: ChatUi,
    suggestions: List<String>,
    onAgree: () -> Unit,
    onSend: (String) -> Unit,
    onBack: () -> Unit,
) {
    var input by remember { mutableStateOf("") }
    val list = rememberLazyListState()
    LaunchedEffect(ui.messages.size) { if (ui.messages.isNotEmpty()) list.animateScrollToItem(ui.messages.size - 1) }

    Column(Modifier.fillMaxSize().background(Palette.Paper).safeDrawingPadding().imePadding()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 20.dp, end = 8.dp, top = 12.dp)) {
            Column(Modifier.weight(1f)) {
                Text("AI 건강 상담", color = Palette.Navy, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                ui.remaining?.let { Text("오늘 남은 질문 ${it}번", color = Palette.Muted, fontSize = 12.sp) }
            }
            TextButton(onClick = onBack) { Text("닫기", color = Palette.Teal) }
        }
        when {
            !ui.configured -> Notice("AI 상담은 서버가 연결된 빌드에서 쓸 수 있어요.")
            !ui.consented -> Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("시작하기 전에", color = Palette.Teal, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                Text(CHAT_NOTICE, color = Palette.Body, fontSize = 15.sp, lineHeight = 23.sp)
                Button(
                    onClick = onAgree,
                    colors = ButtonDefaults.buttonColors(containerColor = Palette.Teal),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("알겠어요, 시작할게요") }
            }
            else -> {
                LazyColumn(
                    state = list,
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                ) {
                    if (ui.messages.isEmpty()) {
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("수면, 운동, 오늘 점수에 대해 물어보세요.", color = Palette.Muted, fontSize = 14.sp)
                                suggestions.forEach { s ->
                                    Text(
                                        s,
                                        color = Palette.Navy,
                                        fontSize = 15.sp,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(14.dp))
                                            .background(Palette.Card)
                                            .clickable { onSend(s) }
                                            .padding(horizontal = 14.dp, vertical = 10.dp),
                                    )
                                }
                            }
                        }
                    }
                    items(ui.messages) { Bubble(it) }
                    if (ui.sending) item { Text("답을 쓰는 중이에요…", color = Palette.Muted, fontSize = 14.sp) }
                }
                ui.error?.let { Text(it, color = Palette.Coral, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 20.dp)) }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(12.dp)) {
                    OutlinedTextField(
                        value = input,
                        onValueChange = { input = it.take(500) },
                        placeholder = { Text("궁금한 것을 적어 주세요") },
                        modifier = Modifier.weight(1f),
                        maxLines = 4,
                    )
                    Button(
                        onClick = {
                            onSend(input.trim())
                            input = ""
                        },
                        enabled = input.isNotBlank() && !ui.sending,
                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Navy),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.padding(start = 8.dp),
                    ) { Text("보내기") }
                }
            }
        }
    }
}

@Composable
private fun Notice(text: String) {
    Text(text, color = Palette.Body, fontSize = 15.sp, modifier = Modifier.padding(20.dp))
}

@Composable
private fun Bubble(m: ChatMessage) {
    Box(Modifier.fillMaxWidth(), contentAlignment = if (m.fromUser) Alignment.CenterEnd else Alignment.CenterStart) {
        Text(
            m.text,
            color = if (m.fromUser) Palette.Card else if (m.crisis) Palette.Coral else Palette.Navy,
            fontSize = 15.sp,
            lineHeight = 22.sp,
            modifier = Modifier
                .widthIn(max = 300.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(if (m.fromUser) Palette.Teal else Palette.Card)
                .padding(horizontal = 14.dp, vertical = 10.dp),
        )
    }
}
