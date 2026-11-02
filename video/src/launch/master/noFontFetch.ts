// Imported first by the Bun checks that load the scenes (check.ts). When a scene module loads, Remotion's font registry
// fetches each font's relative URL (@remotion/fonts' loadFont). Outside a browser that rejects with "fetch() URL is
// invalid" after the check has printed, and Bun then exits 1 although the plan passed. Only that rejection is ignored;
// any other one still fails the run.
process.on("unhandledRejection", (reason) => {
  if (reason instanceof TypeError && /fetch\(\) URL is invalid/.test(reason.message)) return;
  console.error(reason);
  process.exit(1);
});
