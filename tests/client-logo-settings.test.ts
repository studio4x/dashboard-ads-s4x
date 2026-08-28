import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CLIENT_LOGO_SETTINGS, getClientLogoImageCss, getClientLogoImageStyle, normalizeClientLogoSettings } from "../src/lib/client-logo-settings.ts";

test("usa enquadramento padrão compatível com o PDF existente", () => {
  assert.deepEqual(normalizeClientLogoSettings(null), DEFAULT_CLIENT_LOGO_SETTINGS);
});

test("normaliza zoom, foco e modo de encaixe", () => {
  assert.deepEqual(normalizeClientLogoSettings({ fit: "contain", zoom: 4.2, positionX: -15, positionY: 72.4 }), {
    fit: "contain", zoom: 3, positionX: 0, positionY: 72,
  });
});

test("gera o mesmo enquadramento para React e HTML do PDF", () => {
  const settings = { fit: "cover" as const, zoom: 1.35, positionX: 22, positionY: 81 };
  assert.deepEqual(getClientLogoImageStyle(settings), {
    objectFit: "cover", objectPosition: "22% 81%", transform: "scale(1.35)", transformOrigin: "22% 81%",
  });
  assert.equal(getClientLogoImageCss(settings), "object-fit:cover;object-position:22% 81%;transform:scale(1.35);transform-origin:22% 81%");
});
