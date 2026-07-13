import { createAdminClient } from "@/lib/supabase/server";

const BRANDING_ID = "default";
const BRANDING_BUCKET = "logos";

export type BrandingAsset = "logoDark" | "logoLight" | "favicon";

export type PlatformBranding = {
  logoDarkUrl: string;
  logoLightUrl: string;
  faviconUrl: string;
  updatedAt: string | null;
};

const FALLBACK_BRANDING: PlatformBranding = {
  logoDarkUrl: "/logotipo-s4x.svg",
  logoLightUrl: "/logotipo-s4x.svg",
  faviconUrl: "/favicon.ico",
  updatedAt: null,
};

const PATH_FIELDS: Record<BrandingAsset, "logo_dark_path" | "logo_light_path" | "favicon_path"> = {
  logoDark: "logo_dark_path",
  logoLight: "logo_light_path",
  favicon: "favicon_path",
};

function addCacheBust(url: string, updatedAt: string | null) {
  if (!updatedAt || url.startsWith("/")) return url;
  const version = encodeURIComponent(updatedAt);
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

function getPublicUrl(supabase: Awaited<ReturnType<typeof createAdminClient>>, path: string | null, fallback: string, updatedAt: string | null) {
  if (!path) return fallback;
  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(path);
  return addCacheBust(data.publicUrl, updatedAt);
}

export const BrandingService = {
  async getBranding(): Promise<PlatformBranding> {
    try {
      const supabase = await createAdminClient({ action: "branding:read" });
      const { data, error } = await supabase
        .from("platform_branding")
        .select("logo_dark_path, logo_light_path, favicon_path, updated_at")
        .eq("id", BRANDING_ID)
        .maybeSingle();

      if (error || !data) return FALLBACK_BRANDING;

      const updatedAt = data.updated_at ? String(data.updated_at) : null;
      return {
        logoDarkUrl: getPublicUrl(supabase, data.logo_dark_path, FALLBACK_BRANDING.logoDarkUrl, updatedAt),
        logoLightUrl: getPublicUrl(supabase, data.logo_light_path, FALLBACK_BRANDING.logoLightUrl, updatedAt),
        faviconUrl: getPublicUrl(supabase, data.favicon_path, FALLBACK_BRANDING.faviconUrl, updatedAt),
        updatedAt,
      };
    } catch {
      return FALLBACK_BRANDING;
    }
  },

  async uploadAsset(asset: BrandingAsset, file: Buffer, mimeType: string) {
    const supabase = await createAdminClient({ action: `branding:${asset}:upload` });
    const path = `branding/${asset}`;
    const { error: uploadError } = await supabase.storage
      .from(BRANDING_BUCKET)
      .upload(path, file, {
        contentType: mimeType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { error: settingsError } = await supabase
      .from("platform_branding")
      .upsert(
        {
          id: BRANDING_ID,
          [PATH_FIELDS[asset]]: path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (settingsError) throw settingsError;
    return this.getBranding();
  },
};
