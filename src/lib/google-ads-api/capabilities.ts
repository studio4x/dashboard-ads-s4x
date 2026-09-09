export type GoogleAdsCapability = {
  manualCpc: boolean;
  targetCpa: boolean;
  targetRoas: boolean;
  strategy: string;
  campaignType: string;
  reason: string | null;
};

const MANUAL_CPC = new Set(["MANUAL_CPC", "ENHANCED_CPC"]);
const TARGET_CPA = new Set(["MAXIMIZE_CONVERSIONS", "TARGET_CPA"]);
const TARGET_ROAS = new Set(["MAXIMIZE_CONVERSION_VALUE", "TARGET_ROAS"]);

export function detectGoogleAdsCapabilities(input: { biddingStrategyType?: unknown; campaignType?: unknown }): GoogleAdsCapability {
  const strategy = String(input.biddingStrategyType || "").toUpperCase();
  const campaignType = String(input.campaignType || "").toUpperCase();
  const manualCpc = MANUAL_CPC.has(strategy);
  const targetCpa = TARGET_CPA.has(strategy);
  const targetRoas = TARGET_ROAS.has(strategy);
  const supported = manualCpc || targetCpa || targetRoas || strategy === "MAXIMIZE_CLICKS";
  return {
    manualCpc,
    targetCpa,
    targetRoas,
    strategy,
    campaignType,
    reason: supported ? null : `A estratégia ${strategy || "não identificada"} não oferece esta alteração controlada pela S4X.`,
  };
}

export function assertCapability(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
