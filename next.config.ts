import type { NextConfig } from "next";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

// Obtém a versão base do package.json com segurança
const getBaseVersion = () => {
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return pkg.version || "0.1.0";
  } catch (e) {
    return "0.1.0";
  }
};

// Obtém a contagem de commits para servir como número de revisão automática
const getGitCommitCount = () => {
  try {
    return execSync("git rev-list --count HEAD").toString().trim();
  } catch (e) {
    return "0";
  }
};

// Obtém o hash do commit atual (fallback para Vercel se disponível)
const getGitHash = () => {
  try {
    return (
      process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) ||
      execSync("git rev-parse --short HEAD").toString().trim()
    );
  } catch (e) {
    return "unknown";
  }
};

const baseVersion = getBaseVersion();
const commitCount = getGitCommitCount();
// Formato final: 0.1.1.45 (onde 45 é o número do commit)
const fullVersion = commitCount !== "0" ? `${baseVersion}.${commitCount}` : baseVersion;

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/admin/automations/report-dispatch": [
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/cron/report-dispatch": [
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/share/*/*": [
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: fullVersion,
    NEXT_PUBLIC_GIT_HASH: getGitHash(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
