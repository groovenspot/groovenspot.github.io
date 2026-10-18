#if DEBUG
import Foundation

/// Debug builds only: launching with `-screenshot <screen>` renders that screen with
/// sample data, so CI can capture App Store screenshots in the Simulator.
enum ScreenshotMode {
    static var requested: String? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "-screenshot"), index + 1 < arguments.count else { return nil }
        return arguments[index + 1]
    }
}
#endif
