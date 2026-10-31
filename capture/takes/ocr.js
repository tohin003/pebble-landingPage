// Text in pictures, through macOS's own Vision framework (JXA; nothing installed, nothing sent anywhere).
//   osascript -l JavaScript capture/takes/ocr.js <image> [<image> …]
// Prints JSON: [{path, width, height, lines: [{text, confidence, box: [x, y, w, h]}]}], the box in pixels from the
// picture's top-left. Reads image files only: it never looks at the screen.
ObjC.import("Foundation");
ObjC.import("Vision");
ObjC.import("AppKit");

function run(argv) {
  const out = [];
  for (const path of argv) {
    const entry = { path: path, lines: [] };
    try {
      const url = $.NSURL.fileURLWithPath(path);
      const img = $.NSImage.alloc.initWithContentsOfURL(url);
      const rep = img.representations.firstObject;
      const w = rep.pixelsWide, h = rep.pixelsHigh;
      entry.width = w;
      entry.height = h;
      const handler = $.VNImageRequestHandler.alloc.initWithURLOptions(url, $());
      const req = $.VNRecognizeTextRequest.alloc.init;
      req.recognitionLevel = 0; // accurate
      req.usesLanguageCorrection = false;
      const err = Ref();
      if (!handler.performRequestsError($([req]), err)) throw new Error("Vision failed");
      const res = req.results;
      for (let i = 0; i < res.count; i++) {
        const obs = res.objectAtIndex(i);
        const cand = obs.topCandidates(1).firstObject;
        const bb = obs.boundingBox; // normalised, origin bottom-left
        entry.lines.push({
          text: cand.string.js,
          confidence: Math.round(cand.confidence * 100) / 100,
          box: [Math.round(bb.origin.x * w), Math.round((1 - bb.origin.y - bb.size.height) * h),
            Math.round(bb.size.width * w), Math.round(bb.size.height * h)],
        });
      }
    } catch (e) {
      entry.error = String(e);
    }
    out.push(entry);
  }
  return JSON.stringify(out);
}
