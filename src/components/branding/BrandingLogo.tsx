"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type BrandingResponse = {
  logoDarkUrl: string;
  logoLightUrl: string;
  faviconUrl: string;
};

type BrandingLogoProps = {
  variant?: "dark" | "light";
  alt: string;
  fallback: ReactNode;
  style?: CSSProperties;
  className?: string;
};

let cachedBranding: BrandingResponse | null = null;
let brandingRequest: Promise<BrandingResponse | null> | null = null;

async function loadBranding() {
  if (cachedBranding) return cachedBranding;
  if (!brandingRequest) {
    brandingRequest = fetch("/api/branding", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        if (!result?.success || !result.branding) return null;
        cachedBranding = result.branding as BrandingResponse;
        return cachedBranding;
      })
      .catch(() => null)
      .finally(() => {
        brandingRequest = null;
      });
  }
  return brandingRequest;
}

export function BrandingLogo({ variant = "dark", alt, fallback, style, className }: BrandingLogoProps) {
  const [branding, setBranding] = useState<BrandingResponse | null>(cachedBranding);

  useEffect(() => {
    let mounted = true;
    void loadBranding().then((result) => {
      if (mounted) setBranding(result);
    });

    const refresh = () => {
      cachedBranding = null;
      void loadBranding().then((result) => {
        if (mounted) setBranding(result);
      });
    };
    window.addEventListener("branding-updated", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("branding-updated", refresh);
    };
  }, []);

  const source = variant === "light" ? branding?.logoLightUrl : branding?.logoDarkUrl;

  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden", ...style }}>
      {source ? <img src={source} alt={alt} style={{ maxWidth: "100%", maxHeight: "100%", width: "100%", height: "100%", objectFit: "contain" }} /> : fallback}
    </span>
  );
}
