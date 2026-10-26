# Setting up the sample world in the demo user

The full, plain-language guide is the real-take runbook (`.work/real-takes/RUNBOOK.md`, local only). In short:

1. The lead copies the built world to a place the demo user can read:
   `ditto .work/sample-world /Users/Shared/pebble-sample-world` (from the person's account).
2. As the demo user: `bash /Users/Shared/pebble-sample-world/setup/copy_in.sh`. It refuses to run in any other
   account and never overwrites.
3. As the demo user, one at a time (each asks once for permission):
   `osascript notes.applescript`, `osascript calendar.applescript`, `osascript music.applescript`.
4. Between takes: `bash reset_take.sh <photos|notes|app-actions|calculator|all>`.
5. After the last take: the runbook's cleanup (delete `/Users/Shared/pebble-sample-world`, then the demo user).

Everything here is fictional sample data for the Pebble 2.0 film. The photos and tracks are CC0 (MANIFEST.md lists the
source and licence of every file).
