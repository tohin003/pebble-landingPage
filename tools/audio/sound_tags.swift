// Apple's on-device sound classifier (SoundAnalysis, macOS 12+): mean confidence per label over the whole file,
// plus a per-window timeline of the top labels -> lets an agent "hear" vocals/speech/instruments without any download.
// "watch" lists every voice- and alarm-like label (speech, singing, siren, alarm, ringtone, horns ...) with its mean
// and max confidence and the number of 3 s windows where it reached 0.3, so the rubric never relies on the top 15 only;
// "watch_windows" lists, per watch label, every window (start s, confidence) where it reached 0.1, to find the cause.
// Pad sounds shorter than 3 s with silence before tagging them.
// Build: xcrun --sdk macosx swiftc -O -swift-version 5 sound_tags.swift -o sound_tags     Usage: sound_tags FILE
import Foundation
import SoundAnalysis
let watchWords = ["speech", "speak", "talk", "conversation", "narration", "whisper", "sing", "choir", "chant", "yodel",
                  "rap", "humming", "whistl", "shout", "yell", "scream", "laugh", "cry", "baby", "vocal", "siren",
                  "alarm", "ringtone", "telephone", "bell", "buzzer", "beep", "horn", "smoke_detector", "civil_defense"]
final class Collector: NSObject, SNResultsObserving {
  var sums: [String: Double] = [:]; var maxes: [String: Double] = [:]; var over: [String: Int] = [:]
  var windows = 0; var timeline: [[String: Any]] = []; var failure: Error?
  var watchHits: [String: [[Double]]] = [:]   // watch label -> [[window start s, confidence]] where it reached 0.1
  func request(_ request: SNRequest, didProduce result: SNResult) {
    guard let r = result as? SNClassificationResult else { return }
    windows += 1
    for c in r.classifications {
      sums[c.identifier, default: 0] += c.confidence
      maxes[c.identifier] = max(maxes[c.identifier] ?? 0, c.confidence)
      if c.confidence >= 0.3 { over[c.identifier, default: 0] += 1 }
      if c.confidence >= 0.1 && watchWords.contains(where: { c.identifier.contains($0) }) {
        watchHits[c.identifier, default: []].append([(r.timeRange.start.seconds * 10).rounded() / 10,
                                                     (c.confidence * 1000).rounded() / 1000])
      }
    }
    let top = r.classifications.prefix(3).map { ["label": $0.identifier, "p": (($0.confidence * 100).rounded() / 100)] }
    timeline.append(["t": (r.timeRange.start.seconds * 10).rounded() / 10, "top": top])
  }
  func request(_ request: SNRequest, didFailWithError error: Error) { failure = error }
}
do {
  let analyzer = try SNAudioFileAnalyzer(url: URL(fileURLWithPath: CommandLine.arguments[1]))
  let c = Collector()
  let req = try SNClassifySoundRequest(classifierIdentifier: .version1)
  req.windowDuration = CMTime(seconds: 3, preferredTimescale: 48000); req.overlapFactor = 0.0
  try analyzer.add(req, withObserver: c)
  analyzer.analyze()
  if let f = c.failure { throw f }
  let n = Double(max(1, c.windows))
  let r3 = { (x: Double) in (x * 1000).rounded() / 1000 }
  let tags = c.sums.sorted { $0.value > $1.value }.prefix(15).map { ["label": $0.key, "score": r3($0.value / n)] }
  let watch = c.sums.keys.filter { k in watchWords.contains { k.contains($0) } }
    .map { k -> [String: Any] in ["label": k, "mean": r3(c.sums[k]! / n), "max": r3(c.maxes[k] ?? 0), "windows_over_0_3": c.over[k] ?? 0] }
    .sorted { ($0["max"] as! Double) > ($1["max"] as! Double) }
  let json = try JSONSerialization.data(withJSONObject: ["windows": c.windows, "tags": tags, "watch": watch, "timeline": c.timeline,
                                                         "watch_windows": c.watchHits], options: [.prettyPrinted])
  FileHandle.standardOutput.write(json)
} catch { FileHandle.standardError.write(Data("\(error)\n".utf8)); exit(1) }
