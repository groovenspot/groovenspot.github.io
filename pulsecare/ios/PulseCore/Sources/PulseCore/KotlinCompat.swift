import Foundation

// 안드로이드와 같은 숫자·문자열이 나오도록 Kotlin 표준 함수의 동작을 그대로 옮긴 도우미.

extension Double {
    /// Kotlin roundToInt (Math.round): 가장 가까운 정수, 딱 절반이면 큰 쪽. −2.5 → −2.
    var roundToInt: Int {
        let f = rounded(.down)
        return Int(self - f >= 0.5 ? f + 1 : f)
    }
}

extension Sequence where Element == Double {
    /// Kotlin average(): 앞에서부터 더해 개수로 나눔. 비면 NaN.
    var average: Double {
        var sum = 0.0
        var count = 0
        for v in self {
            sum += v
            count += 1
        }
        return count == 0 ? .nan : sum / Double(count)
    }

    var sum: Double { reduce(0.0, +) }
}

extension Array {
    /// Kotlin sortedBy처럼 같은 값끼리는 원래 순서를 지킵니다.
    func stableSorted<K: Comparable>(by key: (Element) -> K) -> [Element] {
        enumerated().sorted { a, b in
            let ka = key(a.element), kb = key(b.element)
            return ka != kb ? ka < kb : a.offset < b.offset
        }.map(\.element)
    }

    func stableSortedDescending<K: Comparable>(by key: (Element) -> K) -> [Element] {
        enumerated().sorted { a, b in
            let ka = key(a.element), kb = key(b.element)
            return ka != kb ? ka > kb : a.offset < b.offset
        }.map(\.element)
    }

    /// 순서를 지키는 중복 제거 (Kotlin distinct).
    func distinct<K: Hashable>(by key: (Element) -> K) -> [Element] {
        var seen = Set<K>()
        return filter { seen.insert(key($0)).inserted }
    }

    /// Kotlin associateBy: 같은 키면 뒤의 것이 남습니다.
    func associateBy<K: Hashable>(_ key: (Element) -> K) -> [K: Element] {
        var out = [K: Element]()
        for e in self { out[key(e)] = e }
        return out
    }
}

enum KotlinFormat {
    /// String.format(Locale.ROOT, "%.1f", x). Java는 십진 표기(가장 짧은 표현)를 반올림(HALF_UP)하므로
    /// 1.25 → "1.3"입니다 (C printf는 "1.2").
    static func oneDecimal(_ x: Double) -> String {
        let text = "\(Swift.abs(x))"
        guard x.isFinite, !text.contains("e"), !text.contains("E") else { return String(format: "%.1f", x) }
        let parts = text.split(separator: ".", omittingEmptySubsequences: false)
        let whole = Int(parts[0]) ?? 0
        let frac = Array(parts.count > 1 ? parts[1] : "") + ["0", "0"]
        var tenths = whole * 10 + Int(String(frac[0]))!
        if Int(String(frac[1]))! >= 5 { tenths += 1 }
        let sign = x < 0 && tenths != 0 ? "-" : ""
        return "\(sign)\(tenths / 10).\(tenths % 10)"
    }

    /// String.format(Locale.ROOT, "%,d", n): 7000 → "7,000".
    static func grouped(_ n: Int) -> String {
        let digits = String(Swift.abs(n))
        var out = ""
        for (i, c) in digits.enumerated() {
            if i > 0 && (digits.count - i) % 3 == 0 { out.append(",") }
            out.append(c)
        }
        return n < 0 ? "-" + out : out
    }

    /// 문자열 템플릿에 null이 들어가면 Kotlin은 "null"을 찍습니다.
    static func str(_ v: Int?) -> String { v.map(String.init) ?? "null" }
}
