export const SITE_NAME = "Baby Bloom Sydney";
export const SITE_DESCRIPTION =
  "Connecting Sydney families with trusted nannies";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const VERIFICATION_TIERS = {
  TIER_1: "Profile Created",
  TIER_2: "WWCC + Passport Verified",
  TIER_3: "Facebook Post Verified",
} as const;

export const MATCHING_WEIGHTS = {
  RATE: 0.3,
  EXPERIENCE: 0.25,
  QUALIFICATIONS: 0.2,
  SKILLS: 0.15,
  OTHER: 0.1,
} as const;

export const BSR_NOTIFICATION_LIMIT = 20;
