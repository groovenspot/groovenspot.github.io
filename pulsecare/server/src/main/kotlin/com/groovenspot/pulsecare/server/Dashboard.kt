package com.groovenspot.pulsecare.server

import com.groovenspot.pulsecare.server.MetricsService.Companion.percent

/** 운영자 지표 페이지 (서버에서 그린 HTML 한 장, 스크립트 없음). */
object Dashboard {

    fun html(r: MetricsReport): String {
        val maxDau = (r.dailyActive.maxOfOrNull { it.count } ?: 0).coerceAtLeast(1)
        fun card(title: String, value: String, note: String = "") =
            """<div class="card"><div class="t">$title</div><div class="v">$value</div><div class="n">$note</div></div>"""
        fun rate(title: String, x: Rate, note: String) = card(
            title,
            percent(x),
            "${x.numerator} / ${x.denominator}" + (x.target?.let { " · 목표 ${(it * 100).toInt()}%" } ?: "") + " · $note",
        )
        val bars = r.dailyActive.joinToString("") { d ->
            val h = (d.count * 100 / maxDau).coerceAtLeast(if (d.count > 0) 2 else 0)
            """<div class="bar" title="${d.day} · ${d.count}명"><span style="height:$h%"></span></div>"""
        }
        val cohortRows = r.cohorts.joinToString("") { c ->
            "<tr><td>${c.week}</td><td>${c.size}</td><td>${percent(c.d1)}</td><td>${percent(c.d7)}</td><td>${percent(c.d30)}</td></tr>"
        }
        val alertRows = r.alertStats.joinToString("") { a ->
            "<tr><td>${a.signal}</td><td>${a.sent}</td><td>${a.ok}</td><td>${a.falseAlarm}</td><td>${percent(a.rate)}</td><td>${a.guardianContacted}</td><td>${a.guardianFalseAlarm}</td></tr>"
        }.ifEmpty { "<tr><td colspan=\"7\">최근 30일 알림이 없어요</td></tr>" }
        val months = r.monthlyRetention.joinToString(" · ") { m ->
            "${m.month} " + if (m.rate.denominator == 0) "(가입 없음)" else "${percent(m.rate)} (${m.rate.numerator}/${m.rate.denominator})"
        }.ifEmpty { "아직 다 익은 달이 없어요" }
        return """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>펄스케어 지표</title>
<style>
:root{--ink:#12233A;--body:#3D4A5C;--muted:#6B7787;--line:#DDE1D9;--paper:#F5F6F1;--card:#FDFDFB;--teal:#0F7B66}
@media (prefers-color-scheme: dark){:root{--ink:#E9EEF3;--body:#C9D1DA;--muted:#97A3B1;--line:#2C3743;--paper:#141B23;--card:#1A232D;--teal:#5CC4AA}}
body{margin:0;background:var(--paper);color:var(--body);font:15px/1.5 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px}
h1{color:var(--ink);font-size:24px;margin:0}h2{color:var(--ink);font-size:17px;margin:28px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.t{color:var(--muted);font-size:13px}.v{color:var(--ink);font-size:26px;font-weight:700}.n{color:var(--muted);font-size:12px}
.bars{display:flex;align-items:flex-end;gap:3px;height:120px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px}
.bar{flex:1;height:100%;display:flex;align-items:flex-end}.bar span{display:block;width:100%;background:var(--teal);border-radius:3px 3px 0 0}
table{width:100%;border-collapse:collapse;background:var(--card);font-size:14px}th,td{border:1px solid var(--line);padding:6px 8px;text-align:right}th:first-child,td:first-child{text-align:left}
.ok{color:var(--teal);font-weight:700}
</style></head><body><main>
<h1>펄스케어 지표</h1><div class="n">${r.day} 기준 (KST) · 이용 통계에 동의한 설치만 · 활성 = 앱 열기·점수 보기·직접 미션 완료·알림 응답·가족 화면</div>
<h2>사용자</h2><div class="grid">
${card("일간 활성 (DAU)", "${r.dau}")}${card("주간 활성 (WAU)", "${r.wau}")}${card("월간 활성 (MAU)", "${r.mau}", "유료 전환 기준 10만 명")}
${card("최근 30일 가입", "${r.signups30}", "기록 지우기 ${r.deletions30}건")}
</div>
<h2>최근 30일 일간 활성</h2><div class="bars">$bars</div>
<h2>핵심 지표</h2><div class="grid">
${rate("북극성: 주간 코칭 실천", r.northStar, "지난주 미션 3번 이상 / MAU")}
${rate("워치 연동률", r.watchLink, "가입 7일 안 첫 기록")}
${rate("첫 점수 도달률", r.firstScore, "가입 10일 안 정식 점수")}
${rate("가족 연결률", r.familyLink, "MAU 중 가족 연결")}
${rate("초대로 들어온 신규", r.inviteSignups, "가입 7일 안 초대 수락")}
${rate("미션 완료율", r.missionCompletion, "최근 7일 완료 / 제시")}
${rate("알림으로 연 비율", r.notificationOpens, "최근 7일 앱 열기 중")}
</div>
<h2>알림 응답 (최근 30일)</h2>
<div class="grid">${rate("알림 오탐 신고율", r.falseAlarm, "본인 \"잘못된 알림\" / 본인에게 보낸 주의 알림")}</div>
<table style="margin-top:10px"><tr><th>신호</th><th>보냄(본인)</th><th>괜찮아요</th><th>잘못된 알림</th><th>오탐 신고율</th><th>보호자 연락함</th><th>보호자 잘못된 알림</th></tr>$alertRows</table>
<h2>주간 가입 코호트 리텐션</h2>
<table><tr><th>가입 주 (월요일)</th><th>가입</th><th>1일째</th><th>7일째</th><th>30일 (29~35일째)</th></tr>$cohortRows</table>
<h2>유료 전환 조건</h2>
<div class="card">MAU ${r.mau} / 100,000 · 월별 30일 리텐션: $months<br>
${if (r.paidSwitchReady) "<span class=\"ok\">조건 충족</span>" else "아직 충족하지 않음 (MAU 10만 이상 또는 30일 리텐션 30% 이상 3개월 연속)"}</div>
</main></body></html>"""
    }
}
