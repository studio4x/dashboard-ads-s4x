import { NextResponse } from "next/server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function isSameOrigin(request: Request) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === expectedOrigin;
  const referer = request.headers.get("referer");
  if (referer) return referer.startsWith(expectedOrigin);
  return false;
}

export function enforceSameOrigin(request: Request) {
  if (isSameOrigin(request)) return null;
  return NextResponse.json(
    { error: "Requisição bloqueada por política de segurança (CSRF)." },
    { status: 403 }
  );
}

export function enforceRateLimit(
  request: Request,
  options: { key: string; limit: number; windowMs: number }
) {
  const ip = getClientIp(request);
  const now = Date.now();
  const bucketKey = `${options.key}:${ip}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (bucket.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  bucket.count += 1;
  buckets.set(bucketKey, bucket);
  return null;
}

export function enforceRateLimitByIdentity(
  identity: string,
  options: { key: string; limit: number; windowMs: number }
) {
  const now = Date.now();
  const bucketKey = `${options.key}:${identity || "unknown"}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (bucket.count >= options.limit) {
    return {
      error: "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
    };
  }

  bucket.count += 1;
  buckets.set(bucketKey, bucket);
  return null;
}
