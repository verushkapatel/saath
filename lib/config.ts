/** Set NEXT_PUBLIC_BASE_PATH (for example "/saath") when the site lives in a sub-folder, such as a GitHub Pages project site. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (path: string): string => (path.startsWith("/") ? `${BASE_PATH}${path}` : path);

export const AI_ENABLED = process.env.NEXT_PUBLIC_SAATH_AI === "1";
export const EXTRACT_TIMEOUT_MS = 8_000;
export const EXTRACT_MAX_CHARS = 12_000;
