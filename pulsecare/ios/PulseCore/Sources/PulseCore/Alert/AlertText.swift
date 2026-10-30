import Foundation

public struct AlertMessage: Hashable, Sendable {
    /// 워치 제목, 15자 이내.
    public var title: String
    public var body: String
    /// 행동 버튼 1개 + 필요하면 "괜찮아요" (최대 2개).
    public var buttons: [String]
}

/// 알림 문구 (기획서 12번 "알림 문구 가이드"): 무엇이 달라졌는지 + 얼마나 + 무엇을 하면 되는지.
/// 병명·진단 표현 없이 "평소와 다른 패턴", 내 기준선과 함께 보여줍니다.
public enum AlertText {
    /// 폰 잠금화면·미리보기에는 수치·병명·가족 이름 없이 급함만.
    public static func lockScreen(_ grade: Grade) -> String {
        grade == .emergency ? "[긴급] 확인이 필요한 알림이 있어요" : "확인할 알림이 있어요"
    }

    public static func forSelf(_ d: Detection) -> AlertMessage {
        let usual = KotlinFormat.str(d.usual?.roundToInt)
        let current = KotlinFormat.str(d.current?.roundToInt)
        let days = KotlinFormat.str(d.days)
        switch d.signal {
        case .sos:
            return AlertMessage(title: "SOS 보냈어요", body: "보호자에게 도움 요청을 보냈어요.", buttons: ["취소하기"])
        case .fall:
            return AlertMessage(title: "넘어지셨나요?", body: "넘어지신 것 같아요. 괜찮으세요? 60초 후 보호자에게 연락해요.", buttons: ["괜찮아요", "도움 요청"])
        case .highHrAtRest:
            return AlertMessage(
                title: "쉬는 중 심박이 높아요",
                body: "쉬고 있는데 심박이 10분째 \(current) bpm이에요. 잠시 앉아 쉬고, 계속되면 전문가와 상담해 보세요.",
                buttons: ["호흡 시작", "괜찮아요"])
        case .lowHrAwake:
            return AlertMessage(
                title: "심박이 평소보다 낮아요",
                body: "깨어 있는데 심박이 10분째 \(current) bpm이에요. 어지러우면 앉아서 쉬고, 계속되면 전문가와 상담해 보세요.",
                buttons: ["자세히 보기", "괜찮아요"])
        case .irregularRhythm:
            return AlertMessage(title: "심장 리듬 확인", body: "워치가 평소와 다른 심장 리듬 패턴을 기록했어요. 전문가와 상담해 보세요.", buttons: ["자세히 보기", "괜찮아요"])
        case .restingHrRise:
            return AlertMessage(
                title: "안정시 심박 상승",
                body: "안정시 심박이 \(days)일째 평소보다 높아요(평소 \(usual) → \(current)). 충분히 쉬고, 계속되면 전문가와 상담해 보세요.",
                buttons: ["자세히 보기", "괜찮아요"])
        case .activityDrop:
            return AlertMessage(title: "걸음 수가 줄었어요", body: "걸음 수가 \(days)일째 평소의 \(percent(d))% 수준이에요. 가볍게 산책해 볼까요?", buttons: ["산책 미션 받기", "괜찮아요"])
        case .lowSpo2:
            return AlertMessage(
                title: "수면 중 산소포화도",
                body: "최근 7일 중 \(days)일, 잘 때 산소포화도가 평소와 다른 패턴을 보였어요. 계속되면 전문가와 상담해 보세요.",
                buttons: ["자세히 보기", "괜찮아요"])
        case .sleepDebt:
            return AlertMessage(title: "수면이 부족해요", body: "이번 주 수면이 평소보다 하루 \(shortfall(d))씩 짧아요. 오늘은 30분 일찍 누워 볼까요?", buttons: ["취침 알림 켜기"])
        case .stress:
            return AlertMessage(title: "쉬어 갈 시간", body: "HRV가 \(days)일째 평소보다 낮아요(평소 \(usual) → \(current)ms). 1분 호흡으로 잠깐 쉬어 볼까요?", buttons: ["호흡 시작"])
        case .medicationMissed:
            return AlertMessage(title: "약 드셨나요?", body: "약 드실 시간이 지났어요. 드셨으면 체크해 주세요.", buttons: ["먹었어요"])
        case .watchNotWorn:
            return AlertMessage(title: "워치를 차 주세요", body: "워치 기록이 하루째 없어요. 착용과 충전을 확인해 주세요.", buttons: ["확인했어요"])
        }
    }

    /// 보호자 문구는 본인 이름과 다음 행동(전화하기)을 먼저.
    public static func forGuardian(_ d: Detection, name: String, location: String? = nil) -> AlertMessage {
        let whereText = location.map { " 현재 위치: \($0)." } ?? ""
        let days = KotlinFormat.str(d.days)
        switch d.signal {
        case .sos:
            return AlertMessage(title: "[긴급] \(name) SOS", body: "[긴급] \(name)\(subject(name)) 도움을 요청했어요.\(whereText)", buttons: ["전화하기", "119 연결"])
        case .fall:
            return AlertMessage(title: "[긴급] \(name) 낙상", body: "[긴급] \(name)\(subject(name)) 넘어진 뒤 응답이 없어요.\(whereText)", buttons: ["전화하기", "119 연결"])
        case .activityDrop:
            return AlertMessage(title: "\(name) 걸음 수 감소", body: "\(name)의 걸음 수가 \(days)일째 평소의 \(percent(d))% 수준이에요. 안부 전화를 드려보세요.", buttons: ["전화하기"])
        case .medicationMissed:
            return AlertMessage(title: "\(name) 약 체크 없음", body: "\(name)의 약 체크가 3시간째 없어요. 안부를 물어보세요.", buttons: ["전화하기"])
        case .watchNotWorn:
            return AlertMessage(title: "\(name) 워치 미착용", body: "\(name)의 워치 기록이 24시간째 없어요. 착용과 충전을 확인해 주세요.", buttons: ["전화하기"])
        default:
            return AlertMessage(title: "\(name) 확인 필요", body: "\(name)에게 며칠째 평소와 다른 패턴이 있어요. 안부를 물어보세요.", buttons: ["전화하기"])
        }
    }

    private static func percent(_ d: Detection) -> Int {
        guard let usual = d.usual, let current = d.current else { return 0 }
        return usual <= 0 ? 0 : (current / usual * 100).roundToInt
    }

    private static func shortfall(_ d: Detection) -> String {
        let minutes = Swift.max(((d.usual ?? 0) - (d.current ?? 0)).roundToInt, 0)
        let rounded = ((minutes + 5) / 10) * 10
        let h = rounded / 60
        let m = rounded % 60
        if h == 0 { return "\(m)분" }
        if m == 0 { return "\(h)시간" }
        return "\(h)시간 \(m)분"
    }

    /// 이름 끝 글자에 받침이 있으면 "이", 없으면 "가".
    public static func subject(_ name: String) -> String {
        guard let last = name.unicodeScalars.last else { return "가" }
        guard (0xAC00...0xD7A3).contains(last.value) else { return "이(가)" }
        return (last.value - 0xAC00) % 28 != 0 ? "이" : "가"
    }
}
