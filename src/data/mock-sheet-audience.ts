// ============================================================
// Mock: Audiência (aba "audience" do Google Sheets)
// ============================================================

import type { AudienceRow } from "@/types/sheet-rows";

export const mockAudienceAge: AudienceRow[] = [
  { date: "2024-04-28", dimension: "age_group", dimension_value: "18-24", sessions: 3842, users: 3420, new_users: 2890, conversions: 82 },
  { date: "2024-04-28", dimension: "age_group", dimension_value: "25-34", sessions: 8940, users: 7820, new_users: 4920, conversions: 242 },
  { date: "2024-04-28", dimension: "age_group", dimension_value: "35-44", sessions: 6820, users: 5940, new_users: 3420, conversions: 184 },
  { date: "2024-04-28", dimension: "age_group", dimension_value: "45-54", sessions: 4280, users: 3680, new_users: 1980, conversions: 108 },
  { date: "2024-04-28", dimension: "age_group", dimension_value: "55-64", sessions: 2840, users: 2420, new_users: 1240, conversions: 62 },
  { date: "2024-04-28", dimension: "age_group", dimension_value: "65+", sessions: 1420, users: 1180, new_users: 580, conversions: 24 },
];

export const mockAudienceGender: AudienceRow[] = [
  { date: "2024-04-28", dimension: "gender", dimension_value: "Feminino", sessions: 17840, users: 15280, new_users: 9280, conversions: 428 },
  { date: "2024-04-28", dimension: "gender", dimension_value: "Masculino", sessions: 10580, users: 8960, new_users: 5750, conversions: 274 },
];

export const mockAudienceChannel: AudienceRow[] = [
  { date: "2024-04-28", dimension: "channel", dimension_value: "Paid Search", sessions: 9840, users: 8420, new_users: 6840, conversions: 312, revenue: 56160 },
  { date: "2024-04-28", dimension: "channel", dimension_value: "Paid Social", sessions: 8240, users: 7120, new_users: 5920, conversions: 248, revenue: 44640 },
  { date: "2024-04-28", dimension: "channel", dimension_value: "Organic Search", sessions: 4820, users: 4280, new_users: 2840, conversions: 96, revenue: 17280 },
  { date: "2024-04-28", dimension: "channel", dimension_value: "Direct", sessions: 3420, users: 2980, new_users: 980, conversions: 82, revenue: 14760 },
  { date: "2024-04-28", dimension: "channel", dimension_value: "Email", sessions: 1842, users: 1620, new_users: 420, conversions: 52, revenue: 9360 },
  { date: "2024-04-28", dimension: "channel", dimension_value: "Referral", sessions: 842, users: 780, new_users: 480, conversions: 18, revenue: 3240 },
  { date: "2024-04-28", dimension: "channel", dimension_value: "Organic Social", sessions: 620, users: 580, new_users: 380, conversions: 8, revenue: 1440 },
];
