package com.groovenspot.pulsecare.mobile.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Health Connect가 "왜 필요한가요?"에서 여는 화면. 접근을 요청하는 모든 앱에 필요합니다. */
class PermissionsRationaleActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PulseTheme {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize().background(Palette.Paper).safeDrawingPadding().padding(24.dp),
                ) {
                    Text("Health Connect 사용 안내", color = Palette.Navy, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Text(
                        "펄스케어는 매일 아침 컨디션 점수와 오늘의 미션을 정하기 위해 수면, 심박 변이(HRV), 안정시 심박, " +
                            "걸음 수, 활동 칼로리, 호흡수, 산소포화도를 읽습니다. 계산은 이 휴대폰 안에서만 하고, " +
                            "건강 수치를 회사나 보험사 등 제휴사에 보내지 않습니다. Health Connect에 데이터를 쓰지 않습니다.",
                        color = Palette.Body,
                        fontSize = 15.sp,
                        lineHeight = 22.sp,
                    )
                    Text(
                        "펄스케어는 진단이나 치료를 하지 않는 웰니스 서비스입니다.",
                        color = Palette.Muted,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}
