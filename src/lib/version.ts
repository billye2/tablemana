import pkg from "../../package.json";

/**
 * Release version, read straight from package.json so `npm run release` is the
 * only thing that ever changes it. Odometer scheme: each segment counts 0–9 and
 * carries (1.0.9 → 1.1.0). Shown at the bottom of the owner help page.
 */
export const APP_VERSION: string = pkg.version;
