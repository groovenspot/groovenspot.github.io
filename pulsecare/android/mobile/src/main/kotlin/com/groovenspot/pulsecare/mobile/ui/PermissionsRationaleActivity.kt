package com.groovenspot.pulsecare.mobile.ui

import android.content.Intent
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
import androidx.compose.material3.TextButton
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.net.toUri
import com.groovenspot.pulsecare.mobile.data.Legal

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
                            "걸음 수, 활동 칼로리, 호흡수, 산소포화도를 읽고, 미션을 했는지 확인하려고 계단 오르기와 운동 기록을 읽습니다. " +
                            "쉬는 중 심박이 120 bpm 이상이거나 깨어 있을 때 40 bpm 미만으로 10분 이어지는지 15분마다 확인하려고 심박을 읽고, " +
                            "앱을 열지 않아도 아침 리포트와 이 알림을 보내기 위해 백그라운드에서도 읽습니다.",
                        color = Palette.Body,
                        fontSize = 15.sp,
                        lineHeight = 22.sp,
                    )
                    Text(
                        "계산은 이 휴대폰 안에서만 하고, 건강 수치를 서버·보험사·광고사에 보내지 않습니다. " +
                            "가족 연결을 켠 경우에만 컨디션 점수·미션·주의 알림이 내가 연결한 보호자에게 전달됩니다. " +
                            "Health Connect에 데이터를 쓰지 않습니다.",
                        color = Palette.Body,
                        fontSize = 15.sp,
                        lineHeight = 22.sp,
                    )
                    Text(
                        "펄스케어는 진단이나 치료를 하지 않는 웰니스 서비스입니다.",
                        color = Palette.Muted,
                        fontSize = 14.sp,
                    )
                    TextButton(onClick = { startActivity(Intent(Intent.ACTION_VIEW, Legal.PRIVACY_URL.toUri())) }) {
                        Text("개인정보 처리방침 보기", color = Palette.Teal)
                    }
                }
            }
        }
    }
}
