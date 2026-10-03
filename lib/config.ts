/** Set NEXT_PUBLIC_BASE_PATH (for example "/saath") when the site lives in a sub-folder, such as a GitHub Pages project site. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (path: string): string => (path.startsWith("/") ? `${BASE_PATH}${path}` : path);

/**
 * Where anonymous cohort numbers are sent, if a student switches sharing on.
 * Leave it unset and the app never sends anything, to anyone.
 */
export const IMPACT_URL = process.env.NEXT_PUBLIC_SAATH_IMPACT_URL ?? "";

/** The public address of this app, used when making a school link or QR code. */
export const PUBLIC_URL = process.env.NEXT_PUBLIC_SAATH_URL ?? "";

/**
 * The address of Saath's AI server (server/saath-ai-worker), if one has been deployed.
 * Leave it unset and Saath AI answers on the device from its checked guides.
 * This is an address, not a key. The model key lives only on that server.
 */
export const AI_URL = process.env.NEXT_PUBLIC_SAATH_AI_URL ?? "";
