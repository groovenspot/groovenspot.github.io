import PulseCore
import SwiftUI
import UIKit

/// 진료용 건강 요약 PDF (미션 P-08). 안드로이드 ClinicPdf와 같은 내용을 A4 두 장으로 그립니다.
/// 의사가 읽도록 점수보다 원래 수치를 먼저 두고, 이 아이폰에서 만들어 사용자가 고른 곳으로만 보냅니다.
enum ClinicPdf {
    struct Meta {
        var name: String?
        var createdOn: LocalDate
    }

    private static let width: CGFloat = 595
    private static let height: CGFloat = 842
    private static let margin: CGFloat = 40
    private static let navy = UIColor(Palette.navy)
    private static let body = UIColor(Palette.body)
    private static let muted = UIColor(Palette.muted)
    private static let line = UIColor(Palette.line)
    private static let teal = UIColor(Palette.teal)

    static func render(_ s: ClinicSummary, _ meta: Meta) -> Data {
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: width, height: height))
        return renderer.pdfData { ctx in
            ctx.beginPage()
            pageOne(s, meta)
            ctx.beginPage()
            pageTwo(s)
        }
    }

    private static func date(_ d: LocalDate) -> String { "\(d.year).\(d.month).\(d.day)" }

    private static func pageOne(_ s: ClinicSummary, _ meta: Meta) {
        var y = margin
        text("건강 요약 · 웨어러블 측정 기록", margin, y, 20, navy, bold: true)
        y += 30
        let who = meta.name.flatMap { $0.isEmpty ? nil : "\($0) · " } ?? ""
        text("\(who)기간 \(date(s.from)) – \(date(s.to)) (\(s.days)일) · 작성 \(date(meta.createdOn))", margin, y, 10.5, body)
        y += 16
        text("측정: 애플워치 등 → 건강 앱 → 펄스케어 앱 요약", margin, y, 9.5, muted)
        y += 26

        let cols: [CGFloat] = [margin, margin + 170, margin + 250, margin + 380, margin + 430]
        for (i, h) in ["항목", "평균", "범위 (최소–최대)", "측정", "앞 절반 → 뒤 절반"].enumerated() { text(h, cols[i], y, 9.5, muted, bold: true) }
        y += 6
        hline(y + 8)
        let rows: [[String]] = [
            row("수면 시간 (시:분)", s.sleep, s.days, hm),
            ["취침 시각 (중앙값)", s.bedtime.map { History.clock($0) } ?? "-", "", "", ""],
            ["6시간 미만 수면", "\(s.shortNights)밤", "", "", ""],
            row("안정시 심박 (bpm)", s.restingHr, s.days) { "\($0.roundedInt)" },
            row("HRV, 수면 중 SDNN (ms)", s.hrv, s.days) { "\($0.roundedInt)" },
            row("걸음 수 (하루)", s.steps, s.days) { grouped($0.roundedInt) },
            row("호흡수, 수면 중 (회/분)", s.respiratoryRate, s.days) { String(format: "%.1f", $0) },
            ["SpO2 90% 미만 반복", s.spo2Nights == 0 ? "측정 없음" : "\(s.lowSpo2Nights)밤", "", s.spo2Nights == 0 ? "" : "\(s.spo2Nights)밤", ""],
        ]
        for r in rows {
            y += 22
            for (i, cell) in r.enumerated() { text(cell, cols[i], y, 10, i == 0 ? navy : body) }
            hline(y + 14)
        }
        let half = s.days / 2
        text("앞 절반 = 처음 \(half)일, 뒤 절반 = 나머지 \(s.days - half)일의 평균", margin, y + 22, 8.5, muted)
        y += 46

        let w = (width - margin * 2 - 16) / 2
        let h: CGFloat = 120
        chart("수면 시간 (시간)", s.dailySleep.map { $0.map { $0 / 60 } }, bars: true, CGRect(x: margin, y: y, width: w, height: h))
        chart("안정시 심박 (bpm)", s.dailyRestingHr, bars: false, CGRect(x: margin + w + 16, y: y, width: w, height: h))
        y += h + 18
        chart("HRV (ms)", s.dailyHrv, bars: false, CGRect(x: margin, y: y, width: w, height: h))
        chart("걸음 수", s.dailySteps, bars: true, CGRect(x: margin + w + 16, y: y, width: w, height: h))
        y += h + 26

        text("평소와 다른 패턴이 이어진 날", margin, y, 12, navy, bold: true)
        y += 6
        if s.signals.isEmpty {
            text("이 기간에 앱의 주의 기준(3일 이상 연속 등)에 해당한 날이 없어요.", margin, y + 16, 10, body)
        } else {
            for sd in s.signals.prefix(6) {
                y += 16
                text("\(sd.date.month)/\(sd.date.day)  \(ClinicReport.label(sd.detection))", margin, y, 10, body)
            }
            if s.signals.count > 6 { text("외 \(s.signals.count - 6)건은 다음 장에", margin, y + 16, 9.5, muted) }
        }
    }

    private static func pageTwo(_ s: ClinicSummary) {
        var y = margin
        text("주간 평균", margin, y, 14, navy, bold: true)
        y += 26
        let cols: [CGFloat] = [margin, margin + 110, margin + 210, margin + 310, margin + 400]
        for (i, h) in ["주 (월요일)", "수면 시간", "안정시 심박", "HRV", "걸음 수"].enumerated() { text(h, cols[i], y, 9.5, muted, bold: true) }
        hline(y + 14)
        for wk in s.weeks {
            y += 20
            let cells = [
                "\(wk.monday.month)/\(wk.monday.day)",
                wk.sleepMinutes.map(hm) ?? "-",
                wk.restingHr.map { "\($0.roundedInt) bpm" } ?? "-",
                wk.hrv.map { "\($0.roundedInt) ms" } ?? "-",
                wk.steps.map { grouped($0.roundedInt) } ?? "-",
            ]
            for (i, c) in cells.enumerated() { text(c, cols[i], y, 10, body) }
            hline(y + 14)
        }
        y += 34
        if s.signals.count > 6 {
            text("평소와 다른 패턴이 이어진 날 (계속)", margin, y, 12, navy, bold: true)
            for sd in s.signals.dropFirst(6) {
                y += 16
                text("\(sd.date.month)/\(sd.date.day)  \(ClinicReport.label(sd.detection))", margin, y, 10, body)
            }
            y += 30
        }
        text("생활 습관", margin, y, 12, navy, bold: true)
        y += 18
        text("미션(하루 한 가지 생활 습관 실천) \(s.missionDays)일 / 기록 \(s.missionLogged)일", margin, y, 10, body)
        if let m = s.scoreMean {
            y += 16
            text("앱 컨디션 점수 평균 \(m) (0~100, 본인 평소 대비 지표로 의학적 기준이 아님)", margin, y, 10, body)
        }
        y += 30
        text("측정값 설명", margin, y, 12, navy, bold: true)
        for note in [
            "수면 시간: 워치가 잠든 것으로 판단한 시간 (낮잠은 최대 1시간 포함). 날짜는 깨어난 날 기준.",
            "안정시 심박: 워치·건강 앱이 계산한 하루 안정시 심박 (없으면 수면 중 값의 중앙값).",
            "HRV: 수면 중 심박 변이(애플워치는 SDNN)의 중앙값. 사람마다 범위가 크게 달라 본인 추이로만 봅니다.",
            "SpO2: 수면 중 산소포화도가 90% 미만으로 떨어진 구간이 5분 넘게 떨어져 두 번 이상 있었던 밤.",
            "주의 기준은 의료 자문 전 초안이며, 본인의 지난 28일 기록과 비교합니다.",
        ] {
            y = paragraph("· \(note)", margin, y + 16, width - margin * 2, 9.5, body)
        }
        paragraph("이 문서는 스마트워치 기록을 펄스케어 앱이 요약한 것으로, 의료기기 측정값이 아니며 진단에 쓸 수 없습니다. 착용 상태와 기기에 따라 오차가 있을 수 있습니다.",
                  margin, height - margin - 30, width - margin * 2, 9, muted)
    }

    private static func row(_ label: String, _ st: Stat, _ days: Int, _ fmt: (Double) -> String) -> [String] {
        [
            label,
            st.mean.map(fmt) ?? "-",
            st.min != nil && st.max != nil ? "\(fmt(st.min!)) – \(fmt(st.max!))" : "-",
            "\(st.days)/\(days)일",
            st.firstHalf != nil && st.secondHalf != nil ? "\(fmt(st.firstHalf!)) → \(fmt(st.secondHalf!))" : "-",
        ]
    }

    private static func hm(_ minutes: Double) -> String {
        let m = minutes.roundedInt
        return String(format: "%d:%02d", m / 60, m % 60)
    }

    private static func grouped(_ n: Int) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "en_US_POSIX")
        return f.string(from: NSNumber(value: n)) ?? String(n)
    }

    // MARK: 그리기

    private static func text(_ s: String, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ color: UIColor, bold: Bool = false) {
        let font = UIFont.systemFont(ofSize: size, weight: bold ? .bold : .regular)
        (s as NSString).draw(at: CGPoint(x: x, y: y - size), withAttributes: [.font: font, .foregroundColor: color])
    }

    @discardableResult
    private static func paragraph(_ s: String, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ size: CGFloat, _ color: UIColor) -> CGFloat {
        let font = UIFont.systemFont(ofSize: size)
        let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color]
        let rect = (s as NSString).boundingRect(with: CGSize(width: w, height: 400), options: .usesLineFragmentOrigin, attributes: attrs, context: nil)
        (s as NSString).draw(with: CGRect(x: x, y: y - size, width: w, height: rect.height), options: .usesLineFragmentOrigin, attributes: attrs, context: nil)
        return y + rect.height - size
    }

    private static func hline(_ y: CGFloat) {
        let path = UIBezierPath()
        path.move(to: CGPoint(x: margin, y: y))
        path.addLine(to: CGPoint(x: width - margin, y: y))
        line.setStroke()
        path.lineWidth = 0.5
        path.stroke()
    }

    private static func chart(_ title: String, _ values: [Double?], bars: Bool, _ frame: CGRect) {
        text(title, frame.minX, frame.minY + 10, 10, navy, bold: true)
        let plot = CGRect(x: frame.minX, y: frame.minY + 18, width: frame.width, height: frame.height - 24)
        let border = UIBezierPath(roundedRect: plot, cornerRadius: 4)
        line.setStroke()
        border.lineWidth = 0.5
        border.stroke()
        let present = values.compactMap { $0 }
        guard let lo = present.min(), let hi = present.max() else {
            text("기록 없음", plot.minX + 8, plot.midY + 4, 9, muted)
            return
        }
        let bottom = bars ? 0 : lo - (hi - lo) * 0.15 - 1
        let top = hi + (hi - bottom) * 0.1 + (hi == bottom ? 1 : 0)
        text(String(format: hi >= 100 ? "%.0f" : "%.1f", hi), plot.maxX - 34, plot.minY + 10, 7.5, muted)
        let step = plot.width / CGFloat(max(values.count, 1))
        func point(_ i: Int, _ v: Double) -> CGPoint {
            CGPoint(x: plot.minX + step * (CGFloat(i) + 0.5), y: plot.maxY - CGFloat((v - bottom) / (top - bottom)) * plot.height)
        }
        teal.setFill()
        teal.setStroke()
        if bars {
            for (i, v) in values.enumerated() {
                guard let v else { continue }
                let p = point(i, v)
                UIBezierPath(rect: CGRect(x: p.x - step * 0.35, y: p.y, width: step * 0.7, height: plot.maxY - p.y)).fill()
            }
        } else {
            let path = UIBezierPath()
            var started = false
            for (i, v) in values.enumerated() {
                guard let v else {
                    started = false
                    continue
                }
                let p = point(i, v)
                if started { path.addLine(to: p) } else { path.move(to: p) }
                started = true
                UIBezierPath(ovalIn: CGRect(x: p.x - 1.5, y: p.y - 1.5, width: 3, height: 3)).fill()
            }
            path.lineWidth = 1.2
            path.stroke()
        }
    }
}

/// 기간을 고르고 PDF를 만들어 공유 시트로 보냅니다.
struct ClinicExportView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var days = 30
    @State private var name = ""
    @State private var busy = false
    @State private var file: URL?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("수면·심박·HRV·걸음 기록을 A4 두 장으로 정리해요. 이 아이폰에서 만들고, 고른 곳으로만 보내요.")
                        .font(.system(size: 14)).foregroundStyle(Palette.body)
                }
                Section("기간") {
                    Picker("기간", selection: $days) {
                        ForEach([14, 30, 90], id: \.self) { Text("최근 \($0)일").tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
                Section("이름 (선택, PDF에 표시)") {
                    TextField("이름", text: $name)
                }
                Section {
                    if let file {
                        ShareLink(item: file) { Label("PDF 보내기", systemImage: "square.and.arrow.up") }
                    } else {
                        Button(busy ? "만드는 중…" : "PDF 만들기") { Task { await make() } }.disabled(busy)
                    }
                }
            }
            .navigationTitle("진료용 건강 요약")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } } }
        }
    }

    private func make() async {
        busy = true
        defer { busy = false }
        guard let summary = await model.clinicSummary(days: days) else { return }
        let data = ClinicPdf.render(summary, ClinicPdf.Meta(name: name.trimmingCharacters(in: .whitespaces), createdOn: model.today))
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("pulsecare-health-summary-\(model.today).pdf")
        do {
            try data.write(to: url)
            file = url
            // 진료용 요약을 만들었으면 P-08 미션은 완료로 봅니다.
            if model.home?.mission.id == "P-08" { await model.completeMission(surface: "report") }
        } catch {
            file = nil
        }
    }
}
