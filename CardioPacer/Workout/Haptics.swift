import WatchKit

enum Haptics {
    /// "징-징": two strong pulses when the heart rate climbs above Zone 2.
    static func zoneExceeded() {
        let device = WKInterfaceDevice.current()
        device.play(.failure)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
            device.play(.failure)
        }
    }

    static func started() {
        WKInterfaceDevice.current().play(.start)
    }

    static func stopped() {
        WKInterfaceDevice.current().play(.stop)
    }
}
