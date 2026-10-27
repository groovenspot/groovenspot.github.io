package com.groovenspot.pulsecare.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable
import com.groovenspot.pulsecare.watch.WatchContract
import com.groovenspot.pulsecare.watch.WatchToday
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.LocalDate

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { WatchApp() }
    }
}

@Composable
private fun WatchApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var today by remember { mutableStateOf(WatchStore.load(context)) }
    var sos by remember { mutableStateOf<SosState?>(null) }
    var seconds by remember { mutableIntStateOf(SOS_COUNTDOWN) }
    var sosResult by remember { mutableStateOf<String?>(null) }

    // 폰이 보호자에게 보낸 결과를 돌려줍니다.
    DisposableEffect(Unit) {
        val client = Wearable.getMessageClient(context)
        val listener = MessageClient.OnMessageReceivedListener { event ->
            if (event.path == WatchContract.PATH_SOS_RESULT) sosResult = String(event.data)
        }
        client.addListener(listener)
        onDispose { client.removeListener(listener) }
    }

    // 리스너가 놓친 요약이 있으면 폰에서 직접 가져옵니다.
    LaunchedEffect(Unit) {
        PhoneLink.fetchToday(context)?.takeIf { it != today }?.let {
            WatchStore.save(context, it)
            today = it
        }
    }

    // 카운트다운이 끝나면 폰으로 보냅니다. 취소하면 아무것도 보내지 않습니다.
    LaunchedEffect(sos) {
        if (sos != SosState.COUNTDOWN) return@LaunchedEffect
        seconds = SOS_COUNTDOWN
        sosResult = null
        while (seconds > 0) {
            delay(1_000)
            seconds--
        }
        sos = if (PhoneLink.sendSos(context)) SosState.SENT else SosState.NO_PHONE
    }

    val current = sos
    if (current != null) {
        SosContent(current, seconds, onCancel = { sos = null }, onClose = { sos = null }, result = sosResult)
        return
    }
    WatchHomeContent(
        today = today,
        display = WatchContract.display(today, LocalDate.now()),
        onDone = {
            val w = today ?: return@WatchHomeContent
            val done: WatchToday = w.copy(missionDone = true)
            WatchStore.save(context, done)
            today = done
            scope.launch { PhoneLink.sendMissionDone(context, w.missionId) }
        },
        onSos = { sos = SosState.COUNTDOWN },
    )
}

const val SOS_COUNTDOWN = 5
