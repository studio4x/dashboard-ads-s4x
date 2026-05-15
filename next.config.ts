import type { NextConfig } from "next";
import { execSync } from "child_process";

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

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.1.0",
    NEXT_PUBLIC_GIT_HASH: getGitHash(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
};

export default nextConfig;
