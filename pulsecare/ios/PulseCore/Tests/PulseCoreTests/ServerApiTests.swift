import Foundation
import XCTest
@testable import PulseCore

/// 서버가 실제로 돌려주는 모양 (null 필드는 빠짐)을 읽을 수 있는지. 안드로이드 ServerApiTest와 같은 사례.
final class ServerApiTests: XCTestCase {

    func testReadsFamilyWithMissingOptionalFields() throws {
        let json = """
        {"guardians":[{"person":{"userId":"g1","name":"민지","phone":"01011112222"},"priority":1}],
         "wearers":[{"person":{"userId":"m1","name":"엄마"},
           "today":{"day":"2027-06-16","score":58,"band":"FAIR","missionTitle":"가벼운 산책 15분","missionDone":false,
             "alerts":[{"signal":"ACTIVITY_DROP","title":"엄마 걸음 수 감소","body":"…"}]},
           "emergencies":[{"id":"e1","wearerId":"m1","signal":"SOS","createdAt":1,"status":"ACTIVE","title":"[긴급] 엄마 SOS","body":"b"}]},
          {"person":{"userId":"d1","name":"아빠"},"emergencies":[]}]}
        """
        let f = try JSONDecoder().decode(Family.self, from: Data(json.utf8))
        XCTAssertEqual(f.guardians.first?.person.phone, "01011112222")
        let mom = f.wearers[0]
        XCTAssertNil(mom.person.phone)
        XCTAssertEqual(mom.today?.score, 58)
        XCTAssertEqual(mom.today?.scoreLine, "58점 · 보통")
        XCTAssertEqual(mom.today?.alerts.first?.title, "엄마 걸음 수 감소")
        XCTAssertTrue(mom.emergencies.first!.active)
        XCTAssertNil(mom.emergencies.first?.closedBy)
        XCTAssertNil(f.wearers[1].today)

        let noScore = try JSONDecoder().decode(Family.self, from: Data("""
        {"guardians":[],"wearers":[{"person":{"userId":"m","name":"엄마"},"today":{"day":"d","missionTitle":"t","missionDone":true}}]}
        """.utf8))
        XCTAssertNil(noScore.wearers[0].today?.score)
        XCTAssertNil(noScore.wearers[0].today?.band)
        XCTAssertEqual(noScore.wearers[0].today?.alerts, [])
    }

    func testSummaryCarriesScoreMissionAndSignalsOnly() throws {
        var home = HomeState(
            date: LocalDate(2027, 6, 16),
            dayIndex: 30,
            score: ScoreResult(kind: .full, score: 58, band: .fair, reason: "수면이 평소보다 짧았어요"),
            mission: MissionLibrary["C-03"],
            missionDone: true,
            canSwap: false,
            alerts: [],
            alertDetections: [Detection(.activityDrop, usual: 8000, current: 3600, days: 3)]
        )
        let j = ServerApi.summaryBody(home)
        XCTAssertEqual(j["day"] as? String, "2027-06-16")
        XCTAssertEqual(j["score"] as? Int, 58)
        XCTAssertEqual(j["band"] as? String, "FAIR")
        XCTAssertEqual(j["missionDone"] as? Bool, true)
        XCTAssertEqual((j["signals"] as? [[String: Any]])?.first?["signal"] as? String, "ACTIVITY_DROP")
        // 이유 문장(수면 시간 등 건강 내용)은 보내지 않습니다.
        XCTAssertNil(j["reason"])
        XCTAssertNoThrow(try JSONSerialization.data(withJSONObject: j))
        home.score = ScoreResult(kind: .noData, score: nil, band: nil, reason: "")
        XCTAssertTrue(ServerApi.summaryBody(home)["score"] is NSNull)
    }

    func testErrorMessageComesFromServer() {
        let e = ServerApi.error(status: 404, data: Data(#"{"error":"INVITE_NOT_FOUND","message":"초대 코드를 찾을 수 없어요"}"#.utf8))
        XCTAssertEqual(e.code, "INVITE_NOT_FOUND")
        XCTAssertEqual(e.localizedDescription, "초대 코드를 찾을 수 없어요")
        XCTAssertEqual(ServerApi.error(status: 502, data: Data("<html>".utf8)).message, "잠시 후 다시 시도해 주세요")
    }

    func testChatTopic() {
        XCTAssertEqual(ServerApi.chatTopic("잠이 잘 안 와요"), "sleep")
        XCTAssertEqual(ServerApi.chatTopic("오늘 운동해도 될까요?"), "exercise")
        XCTAssertEqual(ServerApi.chatTopic("HRV가 뭐예요?"), "score")
        XCTAssertEqual(ServerApi.chatTopic("안녕"), "other")
    }
}
