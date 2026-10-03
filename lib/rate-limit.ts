type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

export function clientIp(header: string | null): string {
  if (!header) return "local";
  return header.split(",")[0]?.trim() || "local";
}

export function allowRequest(ip: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.reset) {
    buckets.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function logAnonymous(code: string): void {
  console.error(JSON.stringify({ level: "error", code }));
}
