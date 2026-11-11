// swift-tools-version:5.9
import PackageDescription

// 안드로이드 core 모듈(Kotlin)을 그대로 옮긴 계산 로직: 컨디션 점수, 미션, 알림 신호, 리포트.
// 같은 입력이면 안드로이드와 같은 결과가 나와야 해서 Tests/Fixtures의 사례로 맞춰 봅니다.
let package = Package(
    name: "PulseCore",
    platforms: [.iOS(.v17), .watchOS(.v10), .macOS(.v13)],
    products: [.library(name: "PulseCore", targets: ["PulseCore"])],
    targets: [
        .target(name: "PulseCore"),
        .testTarget(name: "PulseCoreTests", dependencies: ["PulseCore"], resources: [.copy("Fixtures")]),
    ]
)
