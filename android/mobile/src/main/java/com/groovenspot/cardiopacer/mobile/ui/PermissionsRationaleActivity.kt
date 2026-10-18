package com.groovenspot.cardiopacer.mobile.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri

/** Explains Health Connect use; required by Health Connect for any app requesting access. */
class PermissionsRationaleActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PhoneTheme {
                Surface(Modifier.fillMaxSize()) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.safeDrawingPadding().padding(24.dp),
                    ) {
                        Text("Health Connect 사용 안내", style = MaterialTheme.typography.headlineSmall)
                        Text(
                            "Cardio Pacer는 워치에서 마친 운동(시작·종료 시간, 운동 종류, Zone 2 달성률)을 " +
                                "Health Connect에 운동 세션으로 저장하는 데에만 쓰기 권한을 사용합니다. " +
                                "Health Connect의 데이터를 읽지 않으며, 어떤 데이터도 기기 밖으로 전송하지 않습니다.",
                        )
                        TextButton(onClick = {
                            startActivity(Intent(Intent.ACTION_VIEW, PRIVACY_URL.toUri()))
                        }) { Text("개인정보 처리방침 보기") }
                    }
                }
            }
        }
    }

    private companion object {
        const val PRIVACY_URL = "https://groovenspot.github.io/cardio-pacer/privacy.html"
    }
}
