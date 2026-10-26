// Kiln Board: the sample world's kiln controller, a fictional app made for the Pebble 2.0 film (TREATMENT S12, RS-7:
// "a sample app that Accessibility can't read"). Everything inside its window is drawn by one custom view that exposes
// no accessibility elements, so macOS Accessibility sees only the window and its title bar. To press Start, Pebble has
// to look at the window in a picture and click by position (CHANGELOG 1.9.3, on by default in 1.9.12).
//
// It controls nothing: the "kiln" is a drawing, and Start only starts an on-screen clock.
//
// Build: kilnboard/build.sh (swiftc, through scripts/heavy.sh). Look without opening a window:
//   KilnBoard --render idle.png --render-running running.png

import AppKit

private let boardWidth: CGFloat = 960
private let boardHeight: CGFloat = 600

private struct Program {
    let name: String
    let steps: [String]
    let ramp: [(hours: Double, celsius: Double)]  // cumulative hours, temperature
}

private let programs = [
    Program(name: "Bisque", steps: ["80 °C an hour to 600 °C", "150 °C an hour to 1000 °C", "Hold 15 minutes"],
            ramp: [(0, 20), (7.25, 600), (9.92, 1000), (10.17, 1000)]),
    Program(name: "Glaze", steps: ["100 °C an hour to 600 °C", "150 °C an hour to 1220 °C", "Hold 10 minutes"],
            ramp: [(0, 20), (5.8, 600), (9.93, 1220), (10.1, 1220)]),
]

private func rgb(_ r: Int, _ g: Int, _ b: Int, _ a: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat(r) / 255, green: CGFloat(g) / 255, blue: CGFloat(b) / 255, alpha: a)
}

private let colPanel = rgb(43, 39, 36)
private let colCard = rgb(58, 53, 49)
private let colInk = rgb(242, 234, 222)
private let colInkSoft = rgb(184, 170, 154)
private let colEmber = rgb(214, 112, 64)
private let colGo = rgb(110, 170, 120)

final class BoardView: NSView {
    private var selected = 0
    private var running = false
    private var startedAt: Date?
    private var clock: Timer?

    override var isFlipped: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    // Nothing drawn here is visible to Accessibility: no element, no children.
    override func isAccessibilityElement() -> Bool { false }
    override func accessibilityChildren() -> [Any]? { [] }

    private var cardRects: [NSRect] {
        [NSRect(x: 40, y: 132, width: 430, height: 196), NSRect(x: 490, y: 132, width: 430, height: 196)]
    }
    private let chartRect = NSRect(x: 40, y: 346, width: 880, height: 110)
    private let startRect = NSRect(x: 40, y: 476, width: 880, height: 92)

    func show(running: Bool, elapsed: TimeInterval) {
        self.running = running
        startedAt = running ? Date().addingTimeInterval(-elapsed) : nil
        needsDisplay = true
    }

    override func mouseDown(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        if startRect.contains(p) {
            running.toggle()
            startedAt = running ? Date() : nil
            clock?.invalidate()
            clock = running ? Timer.scheduledTimer(timeInterval: 1, target: self, selector: #selector(tick),
                                                   userInfo: nil, repeats: true) : nil
            needsDisplay = true
            return
        }
        for (i, r) in cardRects.enumerated() where r.contains(p) && !running {
            selected = i
            needsDisplay = true
        }
    }

    @objc private func tick() { needsDisplay = true }

    private func text(_ s: String, _ at: NSPoint, size: CGFloat, weight: NSFont.Weight = .regular, color: NSColor = colInk,
                      mono: Bool = false) {
        let font = mono ? NSFont.monospacedDigitSystemFont(ofSize: size, weight: weight) : NSFont.systemFont(ofSize: size, weight: weight)
        NSAttributedString(string: s, attributes: [.font: font, .foregroundColor: color]).draw(at: at)
    }

    private func textWidth(_ s: String, size: CGFloat, weight: NSFont.Weight) -> CGFloat {
        NSAttributedString(string: s, attributes: [.font: NSFont.systemFont(ofSize: size, weight: weight)]).size().width
    }

    override func draw(_ dirtyRect: NSRect) {
        colPanel.setFill()
        bounds.fill()

        // Header: the name, the kiln's temperature, the status pill.
        text("Kiln Board", NSPoint(x: 40, y: 30), size: 30, weight: .semibold)
        text("Test kiln, studio 1", NSPoint(x: 42, y: 74), size: 15, color: colInkSoft)
        text("20 °C", NSPoint(x: 600, y: 26), size: 44, weight: .light, mono: true)
        let status = running ? "Running" : "Ready"
        let pill = NSRect(x: 790, y: 40, width: 130, height: 36)
        (running ? colGo : colCard).setFill()
        NSBezierPath(roundedRect: pill, xRadius: 18, yRadius: 18).fill()
        let sw = textWidth(status, size: 16, weight: .semibold)
        text(status, NSPoint(x: pill.midX - sw / 2, y: pill.minY + 8), size: 16, weight: .semibold, color: running ? colPanel : colInkSoft)

        // The two programs.
        for (i, r) in cardRects.enumerated() {
            let p = programs[i]
            colCard.setFill()
            NSBezierPath(roundedRect: r, xRadius: 16, yRadius: 16).fill()
            if i == selected {
                colEmber.setStroke()
                let outline = NSBezierPath(roundedRect: r.insetBy(dx: 1.5, dy: 1.5), xRadius: 15, yRadius: 15)
                outline.lineWidth = 3
                outline.stroke()
            }
            let dot = NSRect(x: r.minX + 24, y: r.minY + 28, width: 22, height: 22)
            (i == selected ? colEmber : colInkSoft).setStroke()
            let ring = NSBezierPath(ovalIn: dot)
            ring.lineWidth = 2
            ring.stroke()
            if i == selected {
                colEmber.setFill()
                NSBezierPath(ovalIn: dot.insetBy(dx: 5, dy: 5)).fill()
            }
            text(p.name, NSPoint(x: r.minX + 60, y: r.minY + 22), size: 26, weight: .semibold)
            for (k, line) in p.steps.enumerated() {
                text(line, NSPoint(x: r.minX + 60, y: r.minY + 74 + CGFloat(k) * 34), size: 18, color: colInkSoft)
            }
        }

        // The selected program's ramp, with how far a running firing has got (its clock is real time).
        colCard.setFill()
        NSBezierPath(roundedRect: chartRect, xRadius: 12, yRadius: 12).fill()
        let ramp = programs[selected].ramp
        let maxH = ramp.last!.hours, maxC = 1300.0
        func point(_ h: Double, _ c: Double) -> NSPoint {
            NSPoint(x: chartRect.minX + 24 + CGFloat(h / maxH) * (chartRect.width - 48),
                    y: chartRect.maxY - 16 - CGFloat(c / maxC) * (chartRect.height - 32))
        }
        let line = NSBezierPath()
        line.move(to: point(ramp[0].hours, ramp[0].celsius))
        for s in ramp.dropFirst() { line.line(to: point(s.hours, s.celsius)) }
        line.lineWidth = 3
        colInkSoft.setStroke()
        line.stroke()
        if running, let t0 = startedAt {
            let elapsed = Date().timeIntervalSince(t0)
            let h = Int(elapsed) / 3600, m = (Int(elapsed) % 3600) / 60, s = Int(elapsed) % 60
            text(String(format: "%02d:%02d:%02d", h, m, s), NSPoint(x: chartRect.minX + 24, y: chartRect.minY + 10),
                 size: 20, weight: .medium, color: colGo, mono: true)
            colEmber.setFill()
            let start = point(0, 20)
            NSBezierPath(ovalIn: NSRect(x: start.x - 7, y: start.y - 7, width: 14, height: 14)).fill()
        }

        // Start, or Stop while running.
        (running ? colCard : colEmber).setFill()
        NSBezierPath(roundedRect: startRect, xRadius: 20, yRadius: 20).fill()
        let label = running ? "Stop" : "Start"
        let lw = textWidth(label, size: 34, weight: .semibold)
        text(label, NSPoint(x: startRect.midX - lw / 2, y: startRect.minY + 24), size: 34, weight: .semibold,
             color: running ? colInk : colPanel)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let main = NSMenu()
        let appItem = NSMenuItem()
        main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Quit Kiln Board", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        NSApp.mainMenu = main

        let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: boardWidth, height: boardHeight),
                         styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        w.title = "Kiln Board"
        w.contentView = BoardView(frame: NSRect(x: 0, y: 0, width: boardWidth, height: boardHeight))
        w.center()
        w.makeKeyAndOrderFront(nil)
        window = w
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

private func render(running: Bool, to path: String) {
    let view = BoardView(frame: NSRect(x: 0, y: 0, width: boardWidth, height: boardHeight))
    view.show(running: running, elapsed: 12)
    guard let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) else { exit(2) }
    view.cacheDisplay(in: view.bounds, to: rep)
    guard let png = rep.representation(using: .png, properties: [:]) else { exit(3) }
    do { try png.write(to: URL(fileURLWithPath: path)) } catch { exit(4) }
}

let args = CommandLine.arguments
if args.contains("--render") || args.contains("--render-running") {
    if let i = args.firstIndex(of: "--render"), i + 1 < args.count { render(running: false, to: args[i + 1]) }
    if let i = args.firstIndex(of: "--render-running"), i + 1 < args.count { render(running: true, to: args[i + 1]) }
    exit(0)
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
