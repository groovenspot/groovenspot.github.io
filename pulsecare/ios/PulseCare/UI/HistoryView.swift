import Charts
import PulseCore
import SwiftUI

/// 기록 탭 (기획서 16번): 주간·월간 점수, 수면, 회복 추이와 미션 달력.
/// 건강 수치는 저장하지 않으므로 열 때마다 건강 앱에서 읽어 만듭니다.
struct HistoryView: View {
    @EnvironmentObject private var model: AppModel
    @State private var period = Period.week
    @State private var history: History?
    @State private var selected: HistoryDay?
    @State private var exporting = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("기록").font(.system(size: 26, weight: .bold)).foregroundStyle(Palette.navy)
                    Spacer()
                    Button("진료용 요약 PDF") { exporting = true }.buttonStyle(OutlineButtonStyle())
                }
                Picker("기간", selection: $period) {
                    ForEach(Period.allCases, id: \.self) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)

                if let h = history {
                    content(h)
                } else {
                    Text("기록을 불러오는 중이에요").foregroundStyle(Palette.muted).frame(maxWidth: .infinity, minHeight: 200)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .background(Palette.paper)
        .task(id: period) { history = await model.history(period) }
        .sheet(item: $selected) { DayDetail(day: $0).presentationDetents([.medium, .large]) }
        .sheet(isPresented: $exporting) { ClinicExportView().environmentObject(model) }
    }

    @ViewBuilder
    private func content(_ h: History) -> some View {
        SectionCard {
            ForEach(h.lines, id: \.self) { Text($0).font(.system(size: 15)).foregroundStyle(Palette.body) }
            if h.days.contains(where: \.learning) {
                Text("첫 7일은 내 평소를 배우는 중이라 점수가 흔들릴 수 있어요.").font(.system(size: 13)).foregroundStyle(Palette.muted)
            }
        }
        chartCard("컨디션 점수", h.averageScore.map { "평균 \($0)점" }) {
            Chart {
                ForEach(Array(h.days.enumerated()), id: \.offset) { i, d in
                    if let s = d.score {
                        BarMark(x: .value("날", Double(i)), y: .value("점수", s), width: .ratio(0.7))
                            .foregroundStyle((d.band?.color ?? Palette.muted).opacity(d.learning || d.estimated ? 0.4 : 1))
                    }
                }
            }
            .chartYScale(domain: 0...100)
            .chartXAxis(.hidden)
            .chartOverlay { proxy in tapLayer(proxy, h.days) }
        }
        legend([(Palette.teal, "좋음 이상"), (Palette.amber, "보통"), (Palette.coral, "낮음"), (Palette.teal.opacity(0.4), "학습 중·추정")])

        chartCard("수면 시간", h.averageSleepMinutes.map { "평균 \(History.duration($0))" }) {
            Chart {
                rangeMark(h.sleep.map { UsualRange(low: $0.low / 60, mid: $0.mid / 60, high: $0.high / 60) }, h.days.count)
                ForEach(Array(h.days.enumerated()), id: \.offset) { i, d in
                    if let m = d.sleepMinutes {
                        BarMark(x: .value("날", Double(i)), y: .value("시간", Double(m) / 60), width: .ratio(0.7)).foregroundStyle(Palette.navy)
                    }
                }
            }
            .chartXAxis(.hidden)
            .chartOverlay { proxy in tapLayer(proxy, h.days) }
        }
        if let bt = h.usualBedtime { Text("평소 취침 \(History.clock(bt))").font(.system(size: 13)).foregroundStyle(Palette.muted) }

        lineCard("회복 · HRV", h.hrv.map { "평소 \($0.mid.roundedInt)ms" }, h.days.map(\.hrvMs), h.hrv, h.days)
        lineCard("안정시 심박", h.restingHr.map { "평소 \($0.mid.roundedInt)bpm" }, h.days.map(\.restingHr), h.restingHr, h.days)

        chartCard("미션", "\(h.missionsDone)일 완료") {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 6) {
                ForEach(Array(h.days.enumerated()), id: \.offset) { _, d in
                    let color: Color = d.mission.map { $0.completed ? ($0.auto ? Palette.mint : Palette.teal) : Palette.line } ?? Palette.line.opacity(0.4)
                    VStack(spacing: 2) {
                        RoundedRectangle(cornerRadius: 6).fill(color).frame(height: 26)
                        Text("\(d.date.month)/\(d.date.day)").font(.system(size: 9)).foregroundStyle(Palette.muted)
                    }
                    .onTapGesture { selected = d }
                }
            }
        }
        legend([(Palette.teal, "직접 완료"), (Palette.mint, "워치로 확인"), (Palette.line, "못 한 날")])
    }

    private func chartCard<C: View>(_ title: String, _ note: String?, @ViewBuilder _ chart: () -> C) -> some View {
        SectionCard {
            HStack {
                Text(title).font(.system(size: 16, weight: .bold)).foregroundStyle(Palette.navy)
                Spacer()
                if let note { Text(note).font(.system(size: 13)).foregroundStyle(Palette.muted) }
            }
            chart().frame(minHeight: 140)
        }
    }

    private func lineCard(_ title: String, _ note: String?, _ values: [Double?], _ range: UsualRange?, _ days: [HistoryDay]) -> some View {
        chartCard(title, note) {
            if values.allSatisfy({ $0 == nil }) {
                Text("기록이 없어요").font(.system(size: 13)).foregroundStyle(Palette.muted)
            } else {
                Chart {
                    rangeMark(range, values.count)
                    ForEach(Array(values.enumerated()), id: \.offset) { i, v in
                        if let v {
                            LineMark(x: .value("날", Double(i)), y: .value("값", v)).foregroundStyle(Palette.teal)
                            PointMark(x: .value("날", Double(i)), y: .value("값", v)).foregroundStyle(Palette.teal).symbolSize(20)
                        }
                    }
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .chartXAxis(.hidden)
                .chartOverlay { proxy in tapLayer(proxy, days) }
            }
            Text(range.map { "내 평소 범위 \($0.low.roundedInt)~\($0.high.roundedInt)" } ?? "평소 범위는 기록이 7일 쌓이면 보여요")
                .font(.system(size: 12)).foregroundStyle(Palette.muted)
        }
    }

    @ChartContentBuilder
    private func rangeMark(_ range: UsualRange?, _ count: Int) -> some ChartContent {
        if let r = range {
            RectangleMark(xStart: .value("시작", -0.5), xEnd: .value("끝", Double(count) - 0.5),
                          yStart: .value("낮음", r.low), yEnd: .value("높음", r.high))
                .foregroundStyle(Palette.mint.opacity(0.25))
        }
    }

    /// 막대·점을 누르면 그날 자세히.
    private func tapLayer(_ proxy: ChartProxy, _ days: [HistoryDay]) -> some View {
        GeometryReader { geo in
            Rectangle().fill(.clear).contentShape(Rectangle())
                .onTapGesture { location in
                    guard let plot = proxy.plotFrame else { return }
                    let x = location.x - geo[plot].origin.x
                    if let value: Double = proxy.value(atX: x) {
                        let i = Int(value.rounded())
                        if days.indices.contains(i) { selected = days[i] }
                    }
                }
        }
    }

    private func legend(_ items: [(Color, String)]) -> some View {
        HStack(spacing: 12) {
            ForEach(items, id: \.1) { color, label in
                HStack(spacing: 4) {
                    Circle().fill(color).frame(width: 8, height: 8)
                    Text(label).font(.system(size: 12)).foregroundStyle(Palette.muted)
                }
            }
        }
    }
}

extension HistoryDay: Identifiable {
    public var id: LocalDate { date }
}

extension Double {
    var roundedInt: Int { Int(rounded()) }
}

/// 하루 자세히: 점수와 이유, 수면·심박, 미션, 세부 점수.
struct DayDetail: View {
    var day: HistoryDay

    static let metricNames: [Metric: String] = [
        .sleepDuration: "수면 시간", .sleepQuality: "수면 질", .regularity: "규칙성", .hrv: "HRV",
        .restingHr: "안정시 심박", .activityLoad: "활동 부하", .skinTemp: "피부 온도", .respiratoryRate: "호흡수",
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(koreanDate(day.date)).font(.system(size: 14)).foregroundStyle(Palette.muted)
                HStack(alignment: .bottom, spacing: 10) {
                    Text(day.score.map(String.init) ?? "-").font(.system(size: 44, weight: .bold)).foregroundStyle(Palette.navy)
                    if let band = day.band { Chip(text: band.label, color: band.color) }
                    if day.learning { Chip(text: "학습 중", color: Palette.muted) }
                    if day.estimated { Chip(text: "추정", color: Palette.muted) }
                }
                Text(day.reason ?? (day.dayIndex < 1 ? "가입 전이라 점수는 없어요" : "이날은 밤 기록이 없어요"))
                    .font(.system(size: 16)).foregroundStyle(Palette.body)
                Divider()
                fact("수면", day.sleepMinutes.map { History.duration($0) + (day.bedtime.map { " · \(History.clock($0)) 취침" } ?? "") })
                fact("HRV", day.hrvMs.map { "\($0.roundedInt)ms" })
                fact("안정시 심박", day.restingHr.map { "\($0.roundedInt)bpm" })
                if let m = day.mission {
                    fact("미션", "\(MissionLibrary.find(m.missionId)?.title ?? m.missionId) · \(m.completed ? (m.auto ? "완료 (워치로 확인)" : "완료") : "못 했어요")")
                }
                if !day.subScores.isEmpty {
                    Text("세부 점수").font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.teal).padding(.top, 6)
                    ForEach(Metric.allCases.filter { day.subScores[$0] != nil }, id: \.self) { m in
                        let v = day.subScores[m] ?? 0
                        HStack {
                            Text(Self.metricNames[m] ?? m.rawValue).font(.system(size: 13)).foregroundStyle(Palette.body).frame(width: 90, alignment: .leading)
                            GeometryReader { g in
                                ZStack(alignment: .leading) {
                                    Capsule().fill(Palette.line)
                                    Capsule().fill(Palette.teal).frame(width: g.size.width * min(max(v, 0), 100) / 100)
                                }
                            }
                            .frame(height: 8)
                            Text("\(v.roundedInt)").font(.system(size: 13)).foregroundStyle(Palette.navy).frame(width: 28, alignment: .trailing)
                        }
                    }
                }
            }
            .padding(24)
        }
    }

    private func fact(_ label: String, _ value: String?) -> some View {
        HStack(alignment: .top) {
            Text(label).font(.system(size: 14)).foregroundStyle(Palette.muted).frame(width: 90, alignment: .leading)
            Text(value ?? "기록 없음").font(.system(size: 14)).foregroundStyle(value == nil ? Palette.muted : Palette.navy)
        }
    }
}
