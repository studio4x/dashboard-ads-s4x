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
  env: {
    NEXT_PUBLIC_APP_VERSION: fullVersion,
    NEXT_PUBLIC_GIT_HASH: getGitHash(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
};

export default nextConfig;
