export type ClientLogoFit = "contain" | "cover";

export type ClientLogoSettings = {
  fit: ClientLogoFit;
  zoom: number;
  positionX: number;
  positionY: number;
};

export const DEFAULT_CLIENT_LOGO_SETTINGS: ClientLogoSettings = {
  fit: "cover",
  zoom: 1,
  positionX: 50,
  positionY: 50,
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function normalizeClientLogoSettings(value: unknown): ClientLogoSettings {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    fit: source.fit === "contain" ? "contain" : "cover",
    zoom: Math.round(clamp(source.zoom, 1, 3, 1) * 100) / 100,
    positionX: Math.round(clamp(source.positionX, 0, 100, 50)),
    positionY: Math.round(clamp(source.positionY, 0, 100, 50)),
  };
}

export function getClientLogoImageStyle(value: unknown) {
  const settings = normalizeClientLogoSettings(value);
  return {
    objectFit: settings.fit,
    objectPosition: `${settings.positionX}% ${settings.positionY}%`,
    transform: `scale(${settings.zoom})`,
    transformOrigin: `${settings.positionX}% ${settings.positionY}%`,
  } as const;
}

export function getClientLogoImageCss(value: unknown) {
  const settings = normalizeClientLogoSettings(value);
  return [
    `object-fit:${settings.fit}`,
    `object-position:${settings.positionX}% ${settings.positionY}%`,
    `transform:scale(${settings.zoom})`,
    `transform-origin:${settings.positionX}% ${settings.positionY}%`,
  ].join(";");
}
