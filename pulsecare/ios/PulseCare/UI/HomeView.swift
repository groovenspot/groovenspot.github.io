import PulseCore
import SwiftUI
import UIKit

/// 오늘 탭 (기획서 16번: 점수 → 미션 → 알림 순서). 안드로이드 HomeScreen과 같은 내용입니다.
struct HomeView: View {
    @EnvironmentObject private var model: AppModel
    var onOpenChat: () -> Void
    var onOpenSettings: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                ScreenHeader(caption: model.home.map { koreanDate($0.date) } ?? "", title: "오늘의 컨디션") {
                    if AppConfig.serverConfigured || AppConfig.demo {
                        Button("AI 상담", action: onOpenChat).font(.system(size: 15, weight: .semibold))
                    }
                    Button("내 정보", action: onOpenSettings).font(.system(size: 15, weight: .semibold))
                }
                if let home = model.home {
                    if home.missingPermissions { PermissionBanner() }
                    ScoreCard(home: home) { feeling in Task { await model.refresh(feeling: feeling) } }
                    if let weekly = model.weekly { WeeklyCard(summary: weekly) }
                    MissionCard(home: home, canSwap: home.canSwap)
                    ForEach(Array(home.alerts.enumerated()), id: \.offset) { i, alert in
                        AlertCard(alert: alert, detection: i < home.alertDetections.count ? home.alertDetections[i] : nil)
                    }
                } else {
                    ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .background(Palette.paper)
        .refreshable { await model.refresh() }
        .onAppear {
            if let home = model.home, home.score.score != nil {
                model.metrics.trackDaily(.scoreViewed, key: "app", ["surface": "app", "kind": home.score.kind.rawValue, "day": EventRules.dayBucket(home.dayIndex)])
            }
        }
    }
}

struct ScoreCard: View {
    var home: HomeState
    var onFeeling: (Int) -> Void

    var body: some View {
        let result = home.score
        SectionCard {
            if result.kind == .noData {
                NoDataScore(reason: result.reason, onFeeling: onFeeling)
            } else {
                HStack(alignment: .bottom, spacing: 12) {
                    Text(result.score.map(String.init) ?? "-")
                        .font(.system(size: 64, weight: .bold))
                        .foregroundStyle(Palette.navy)
                    if let band = result.band {
                        VStack(alignment: .leading, spacing: 4) {
                            Chip(text: result.kind == .sleepOnly ? "수면 점수" : band.label, color: band.color)
                            Text(band.advice).font(.system(size: 13)).foregroundStyle(Palette.muted)
                        }
                        .padding(.bottom, 10)
                    }
                }
                Text(result.reason).font(.system(size: 17)).foregroundStyle(Palette.body).fixedSize(horizontal: false, vertical: true)
                if !result.badges.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(Badge.allCases.filter { result.badges.contains($0) }, id: \.self) { Chip(text: $0.label, color: Palette.muted) }
                    }
                }
                if home.learning { LearningProgress(dayIndex: home.dayIndex) }
            }
        }
    }
}

/// SYS-01: 진행률과 "언제부터 무엇이 되는지".
struct LearningProgress: View {
    var dayIndex: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ProgressView(value: Double(min(dayIndex, 7)), total: 7).tint(Palette.teal)
            let next = dayIndex <= 3 ? "4일째부터 심박·HRV를 더한 컨디션 점수를 보여드려요" : "8일째부터 내 평소 기준이 완성돼요"
            Text("내 평소를 배우는 중 · 7일 중 \(dayIndex)일째. \(next)").font(.system(size: 13)).foregroundStyle(Palette.muted)
        }
    }
}

/// SYS-02: 점수 대신 오늘 느낌을 받아 미션을 고릅니다.
struct NoDataScore: View {
    var reason: String
    var onFeeling: (Int) -> Void

    var body: some View {
        Text(reason).font(.system(size: 20, weight: .semibold)).foregroundStyle(Palette.navy)
        HStack(spacing: 8) {
            ForEach([(1, "아주 나쁨"), (2, "나쁨"), (3, "보통"), (4, "좋음"), (5, "아주 좋음")], id: \.0) { value, label in
                Button {
                    onFeeling(value)
                } label: {
                    VStack(spacing: 2) {
                        Text("\(value)").font(.system(size: 17, weight: .bold)).foregroundStyle(Palette.navy)
                        Text(label).font(.system(size: 10)).foregroundStyle(Palette.muted)
                    }
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .background(RoundedRectangle(cornerRadius: 12).stroke(Palette.line, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
        Text("밤에도 워치를 차면 내일 아침 점수를 볼 수 있어요").font(.system(size: 13)).foregroundStyle(Palette.muted)
    }
}

struct MissionCard: View {
    @EnvironmentObject private var model: AppModel
    var home: HomeState
    var canSwap: Bool

    var body: some View {
        let mission = home.mission
        SectionCard {
            HStack {
                Text("오늘의 미션").font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.teal)
                Spacer()
                Text("레벨 \(mission.level) · \(mission.points)점").font(.system(size: 13)).foregroundStyle(Palette.muted)
            }
            Text(mission.title).font(.system(size: 22, weight: .bold)).foregroundStyle(Palette.navy)
            if home.missionDone {
                HStack(spacing: 8) {
                    Circle().fill(Palette.teal).frame(width: 10, height: 10)
                    Text(home.missionCheck == .done ? "워치 기록으로 완료를 확인했어요" : "완료했어요. 내일 또 만나요")
                        .font(.system(size: 15, weight: .semibold)).foregroundStyle(Palette.teal)
                }
            } else {
                Text(missionHint(mission, home.missionCheck)).font(.system(size: 13)).foregroundStyle(Palette.muted)
                HStack(spacing: 8) {
                    Button("완료했어요") { Task { await model.completeMission() } }.buttonStyle(PrimaryButtonStyle())
                    if canSwap {
                        Button("다른 미션") { Task { await model.swapMission() } }.foregroundStyle(Palette.muted)
                    }
                }
            }
        }
    }
}

/// 미션을 어떻게 확인하는지 한 줄로.
func missionHint(_ mission: Mission, _ check: Check) -> String {
    if mission.id == "P-08" { return "기록 탭 > 진료용 요약 PDF를 만들어 보내면 완료돼요. 부모님 폰에서 만들어 받았다면 직접 체크해 주세요" }
    if check == .manual || mission.verification == .manual { return "하고 나서 직접 체크해 주세요" }
    if MissionVerifier.nightMissions.contains(mission.id) { return "오늘 밤 수면 기록으로 내일 아침 자동으로 확인해요" }
    if check == .missed { return "기록에서 아직 확인되지 않았어요. 했다면 직접 체크해 주세요" }
    return "애플워치 기록으로 자동 확인해요. 워치가 없을 땐 직접 체크해도 돼요"
}

/// 일요일 저녁 주간 리포트 (기획서 14번). 올리기는 묻고, 내리기는 이미 적용된 걸 부드럽게 알립니다.
struct WeeklyCard: View {
    @EnvironmentObject private var model: AppModel
    var summary: WeeklySummary
    @State private var changingGoal = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("이번 주 리포트").font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.mint)
            Text(summary.title).font(.system(size: 22, weight: .bold)).foregroundStyle(Palette.paper)
            HStack(spacing: 6) {
                ForEach(0..<7, id: \.self) { i in
                    Circle().fill(i < summary.daysDone ? Palette.mint : Palette.body).frame(width: 12, height: 12)
                }
            }
            ForEach(summary.lines, id: \.self) { Text($0).font(.system(size: 15)).foregroundStyle(Palette.line) }
            HStack {
                if summary.suggestGoalChange {
                    Button("목표 바꾸기") { changingGoal = true }.buttonStyle(PrimaryButtonStyle(color: Palette.mint, textColor: Palette.navy))
                    Button("이대로 할게요") { model.closeWeekly(acceptLevel: false) }.foregroundStyle(Palette.line)
                } else if summary.levelChange == .suggestUp {
                    Button("레벨 \(summary.nextLevel) 도전") { model.closeWeekly(acceptLevel: true) }
                        .buttonStyle(PrimaryButtonStyle(color: Palette.mint, textColor: Palette.navy))
                    Button("지금이 좋아요") { model.closeWeekly(acceptLevel: false) }.foregroundStyle(Palette.line)
                } else {
                    Button("확인") { model.closeWeekly(acceptLevel: false) }.font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.mint)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.navy, in: RoundedRectangle(cornerRadius: 20))
        .sheet(isPresented: $changingGoal) {
            GoalView(changing: true) { goal in
                model.changeGoal(goal)
                model.closeWeekly(acceptLevel: false)
                changingGoal = false
            }
            .environmentObject(model)
        }
    }
}

struct AlertCard: View {
    @EnvironmentObject private var model: AppModel
    var alert: AlertMessage
    var detection: Detection?

    var body: some View {
        SectionCard {
            Text(alert.title).font(.system(size: 16, weight: .bold)).foregroundStyle(Palette.navy)
            Text(alert.body).font(.system(size: 15)).foregroundStyle(Palette.body).fixedSize(horizontal: false, vertical: true)
            // 정보 등급(수면 부족 등)은 코칭이라 응답을 받지 않고, 주의 신호만 맞는지 묻습니다.
            if let d = detection, d.signal.grade == .caution { feedback(d) }
        }
    }

    @ViewBuilder
    private func feedback(_ d: Detection) -> some View {
        if let until = model.snoozedUntil[d.signal] {
            HStack {
                Text("\(until.month)/\(until.day)까지 이 알림은 쉬는 중이에요").font(.system(size: 13)).foregroundStyle(Palette.muted)
                Spacer()
                Button("다시 받기") { model.unsnooze(d.signal) }
            }
        } else if model.snoozeSuggestions.contains(d.signal) {
            Text("최근 이 알림이 두 번 틀렸다고 하셨어요. 7일 동안 쉴까요?").font(.system(size: 14)).foregroundStyle(Palette.navy)
            HStack(spacing: 8) {
                Button("7일 쉬기") { model.snooze(d.signal, accept: true) }.buttonStyle(OutlineButtonStyle())
                Button("계속 받기") { model.snooze(d.signal, accept: false) }.foregroundStyle(Palette.muted)
            }
        } else if let response = model.todayResponse(d.signal) {
            Text(response == .falseAlarm ? "알려 주셔서 고마워요. 알림 기준을 고치는 데 써요." : "답해 주셔서 고마워요. 더 나빠지지 않으면 24시간 동안 다시 알리지 않아요.")
                .font(.system(size: 13)).foregroundStyle(Palette.teal)
        } else {
            HStack(spacing: 8) {
                Button(FeedbackResponse.ok.label) { model.feedback(d, .ok) }.buttonStyle(OutlineButtonStyle())
                Button(FeedbackResponse.falseAlarm.label) { model.feedback(d, .falseAlarm) }.foregroundStyle(Palette.muted)
            }
        }
    }
}

struct PermissionBanner: View {
    var body: some View {
        HStack {
            Text("일부 건강 데이터 권한이 꺼져 있어 수면 위주로 계산했어요").font(.system(size: 13)).foregroundStyle(Palette.paper)
            Spacer()
            Button("켜기") {
                if let url = URL(string: "x-apple-health://") { UIApplication.shared.open(url) }
            }
            .font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.mint)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Palette.navy, in: RoundedRectangle(cornerRadius: 16))
    }
}
