// ── Verification Data Systems Constants ──
// Reference: verification_pipeline/verification-data-systems.md
//
// Shared between server actions and client components.
// NOT a 'use server' file — plain module.

export const VERIFICATION_STATUS = {
  NOT_STARTED: 0,
  PENDING_ID_AUTO: 10,
  PENDING_ID_REVIEW: 11,
  ID_REJECTED: 12,
  PENDING_WWCC_AUTO: 20,
  WWCC_PROCESSING: 25,            // transient — claimed by one invocation, prevents double-run
  PENDING_WWCC_REVIEW: 21,       // manual entry — admin verifies on OCG portal
  WWCC_REJECTED: 22,
  WWCC_EXPIRED: 23,
  WWCC_DOCUMENT_FAILED: 24,      // auto-check failed — nanny resubmits or switches to manual
  PROVISIONALLY_VERIFIED: 30,
  FULLY_VERIFIED: 40,
} as const;

export const VERIFICATION_LEVEL = {
  SIGNED_UP: 0,
  REGISTERED: 1,
  ID_VERIFIED: 2,
  PROVISIONALLY_VERIFIED: 3,
  FULLY_VERIFIED: 4,
} as const;

// Label map for admin UI display: "Label (integer)"
export const STATUS_LABELS: Record<number, string> = {
  0: 'Not Started (0)',
  10: 'Pending ID Auto (10)',
  11: 'Pending ID Review (11)',
  12: 'ID Rejected (12)',
  20: 'Pending WWCC Auto (20)',
  25: 'WWCC Processing (25)',
  21: 'Pending WWCC Review (21)',
  22: 'WWCC Rejected (22)',
  23: 'WWCC Expired (23)',
  24: 'WWCC Document Failed (24)',
  30: 'Provisionally Verified (30)',
  40: 'Fully Verified (40)',
};

export const LEVEL_LABELS: Record<number, string> = {
  0: 'Signed Up (0)',
  1: 'Registered (1)',
  2: 'ID Verified (2)',
  3: 'Provisionally Verified (3)',
  4: 'Fully Verified (4)',
};
