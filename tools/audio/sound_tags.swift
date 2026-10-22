// Apple's on-device sound classifier (SoundAnalysis, macOS 12+): mean confidence per label over the whole file,
// plus a per-window timeline of the top labels -> lets an agent "hear" vocals/speech/instruments without any download.
import Foundation
import SoundAnalysis
final class Collector: NSObject, SNResultsObserving {
  var sums: [String: Double] = [:]; var windows = 0; var timeline: [[String: Any]] = []; var failure: Error?
  func request(_ request: SNRequest, didProduce result: SNResult) {
    guard let r = result as? SNClassificationResult else { return }
    windows += 1
    for c in r.classifications { sums[c.identifier, default: 0] += c.confidence }
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
  let tags = c.sums.sorted { $0.value > $1.value }.prefix(15).map { ["label": $0.key, "score": (($0.value / n) * 1000).rounded() / 1000] }
  let json = try JSONSerialization.data(withJSONObject: ["windows": c.windows, "tags": tags, "timeline": c.timeline], options: [.prettyPrinted])
  FileHandle.standardOutput.write(json)
} catch { FileHandle.standardError.write(Data("\(error)\n".utf8)); exit(1) }
