/**
 * Remotion CLI and Studio config (MASTER_PLAN §5.4). It does NOT apply to the Node APIs (renderMedia() and friends):
 * pass options there explicitly. Codec, CRF and bitrate stay on each render command.
 * All configuration options: https://remotion.dev/docs/config
 */
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
Config.setChromiumOpenGlRenderer("angle"); // WebGL2 for @remotion/effects
Config.setColorSpace("bt709"); // accurate web colours (the v4 default is bt601)
Config.setConcurrency(2); // 8 GB Mac: 2 for heavy scenes; raise to 3 for light loops on the command line
