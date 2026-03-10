import { openai } from './client';
import { type ShareCaseType, SHARE_CASE_TYPE } from '@/lib/viral-loop/constants';

// ── Result type ──

export interface ScreenshotCheckResult {
  verdict: 'approved' | 'failed';
  confidence: number;
  checks: {
    is_facebook: boolean;
    is_group_post: boolean;
    is_relevant_group: boolean;
    content_matches: boolean;
    is_recent: boolean;
    is_publicly_visible: boolean;
    link_present: boolean;
    name_matches: boolean;
    reference_code_matches: boolean;
  };
  detected_group_name: string | null;
  fail_reasons: string[];
  user_guidance: string | null;
  ai_raw: Record<string, unknown>;
}

// ── Hard-coded user-friendly guidance messages ──

const GUIDANCE = {
  not_facebook:
    "Oops! It looks like the image you uploaded isn't of your shared profile. Try uploading a screenshot of your post in a Facebook group.",
  not_group_post:
    "Oops! It looks like your screenshot isn't showing a Facebook group post. Try taking a new screenshot that shows the group name at the top and your post in the group feed.",
  not_relevant_group:
    "Oops! It looks like your post wasn't shared in a childcare or parenting group. Try sharing in a Sydney mums, nannies, or childcare Facebook group — that's where families will see you!",
  no_link:
    "We couldn't find the link to your profile in your screenshot. Try taking the screenshot again showing your full post on the screen so we can spot it!",
  content_mismatch:
    "Hmm, we couldn't match your post to your Baby Bloom listing. Make sure you're sharing the post we generated for you — it contains specific details about your listing!",
  name_mismatch:
    "The name on your post doesn't seem to match your Baby Bloom account. Make sure you're sharing from your own Facebook profile!",
  not_recent:
    "Hmm, it looks like your post wasn't shared recently. Let's give families a fresh opportunity to discover you by sharing your profile again!",
  not_visible:
    "Oops! It looks like your post was shared privately. Try sharing in a Sydney mums, nannies, or childcare Facebook group — that's where families will see you!",
  technical_error:
    "Oops, looks like we're having technical issues on our end. Please try uploading your screenshot again!",
  reference_code_mismatch:
    "We couldn't spot your job's reference code in the screenshot. Make sure the link preview image is visible in your screenshot — it has a small code in the bottom-right corner!",
  generic_fallback:
    "We couldn't quite verify your screenshot. Try taking a clear screenshot showing your full post in a Sydney childcare Facebook group and upload it again!",
} as const;

// ── Shared system prompt (Facebook UI verification) ──

const FB_UI_SYSTEM_BASE = `You are a Facebook UI verification specialist. Your task is to analyse a screenshot and determine if it shows a genuine, recently published post inside a Facebook group.

Use chain-of-thought reasoning internally, then output ONLY JSON.

## Verification Process

### 1. Is this Facebook?
First determine if the screenshot is from Facebook at all. Look for:
- Facebook's distinctive blue header, navigation icons, or logo
- Facebook-specific UI elements (reactions, comment/share buttons, profile pictures with Facebook styling)
- If this is clearly NOT Facebook (e.g. a random photo, another app, a website), set is_facebook to false and skip all other checks.

### 2. Layout & Group Context
If it IS Facebook, determine if this is a GROUP post (not a personal profile/timeline, page, or story):
- "Posted in [Group Name]" header
- Group UI elements: rules link, member count, cover photo, "Join/Joined" button
- Mobile: group avatar next to group name/back arrow
- Desktop: expanded sidebars, group navigation
- Group-exclusive badges next to poster name (three-people circle, shield, hand/wave, star)

### 3. Poster Identity
Check if the poster's name matches the expected user name (allow nicknames, partials, additional names — e.g. "Jane Smith" matches "Janie S." or "J. Smith", but reject clear mismatches).

### 4. Privacy & Visibility
**CRITICAL: If a PADLOCK icon appears next to the poster's name, this means the post is private (Only Me/Friends) — NOT visible to the group. Set is_publicly_visible to false.**
- "Public Group" / "Private Group" labels are fine (that's the group's privacy, not the post's)
- Post must be in a group feed (not Stories, Friends tab, profile timeline, or page)

### 5. Recency — BE STRICT
**This check is critical. You must be strict about recency.**
Verify the timestamp on the post. ONLY approve if it shows:
- "Just now", "Xm" (minutes), "Xh" (hours) — APPROVED
- "Xd" (days) where X is 1-7 — APPROVED
- "Yesterday" — APPROVED
- "Pending Approval" or similar moderation text — APPROVED
- A specific date within the last 7 days from today — APPROVED

FAIL recency if:
- The timestamp shows a specific date older than 7 days (e.g. "March 2025", "15 February", last year)
- The timestamp shows weeks, months, or years (e.g. "2w", "3mo", "1y", "March 15")
- No timestamp is visible at all
- Any ambiguous date that could be older than 7 days

**When in doubt about recency, FAIL it. We want FRESH posts only.**

### 6. Group Relevance
Examine the group name, description, or any visible context to determine if this is a childcare, nanny, babysitting, parenting, or family-related group in Sydney/Australia.
- Keywords: nanny, babysitter, childcare, au pair, mum, mom, parent, family, kids, children, daycare, ECEC
- Sydney/Australian location indicators
- If the group name is not visible but group UI indicators are strong, note as "unknown but plausible"

### 7. Link Check
The post MUST contain a Baby Bloom link element. Look for:
- A Facebook link preview card/attachment showing "babybloomsydney.com.au" (any slug is OK)
- The URL text "babybloomsydney.com.au" visible in the post body
- If the post is cut off and the link might be below the visible area, set link_present to false

### 8. Post Content Check
{CONTENT_CHECK_INSTRUCTIONS}

### 9. Reference Code Check (if provided)
If a reference code was specified in the instructions, look at the link preview card/image in the post. In the bottom-right corner of that preview image, directly above the "BabyBloom" logo text, there should be a 5-character code in small gray text. Check if this code matches the expected reference code exactly. Set reference_code_matches to true if it matches, false if not visible or different. If no reference code was specified, set to true.

## Decision Criteria
APPROVE only if ALL checks pass. If ANY check fails, DECLINE.

## Output Format
Return ONLY this JSON (no other text):
{
  "verdict": "Approved" or "Declined",
  "confidence": 0-100,
  "is_facebook": true/false,
  "is_group_post": true/false,
  "is_relevant_group": true/false,
  "content_matches": true/false,
  "is_recent": true/false,
  "is_publicly_visible": true/false,
  "link_present": true/false,
  "name_matches": true/false,
  "reference_code_matches": true/false,
  "detected_group_name": "Group Name" or null,
  "detected_timestamp": "the timestamp text visible on the post" or null,
  "reasoning": "Concise chain-of-thought summary"
}`;

// ── Case-specific content check instructions ──

const CONTENT_CHECK_NANNY_PROFILE = `Examine the post content. This should be a nanny/babysitter advertising their services or availability. Look for:
- First-person language about being available to nanny or babysit
- Mentions of experience, qualifications, WWCC, First Aid
- Sydney suburb or area mentioned
- Availability information (days, hours, schedule)
- References to Baby Bloom
The tone should be warm and professional — someone offering childcare services.`;

const CONTENT_CHECK_PARENT_POSITION = `Examine the post content. This should be a parent/family looking for a nanny. Look for:
- First-person language about looking for a nanny or childcare help
- Mentions of children (number, ages)
- Schedule needs (days per week, hours)
- Location (Sydney suburb)
- Requirements (experience, WWCC, First Aid, driver's licence, etc.)
- References to Baby Bloom
The tone should be warm and genuine — a family seeking childcare support.`;

const CONTENT_CHECK_PARENT_BSR = `Examine the post content. This should be a parent looking for a babysitter for a specific date/time. Look for:
- Urgency or time-specificity ("this Saturday", "tonight", a specific date)
- Babysitting context (not ongoing nanny position)
- Mentions of children (number, ages)
- Specific time slot (evening, afternoon, etc.)
- Location (Sydney suburb)
- References to Baby Bloom
The tone should be casual and slightly urgent — someone needing a babysitter soon.`;

function getContentCheckInstructions(caseType: ShareCaseType): string {
  switch (caseType) {
    case SHARE_CASE_TYPE.NANNY_PROFILE:
      return CONTENT_CHECK_NANNY_PROFILE;
    case SHARE_CASE_TYPE.PARENT_POSITION:
      return CONTENT_CHECK_PARENT_POSITION;
    case SHARE_CASE_TYPE.PARENT_BSR:
      return CONTENT_CHECK_PARENT_BSR;
    default:
      return CONTENT_CHECK_NANNY_PROFILE;
  }
}

function buildSystemPrompt(caseType: ShareCaseType): string {
  return FB_UI_SYSTEM_BASE.replace(
    '{CONTENT_CHECK_INSTRUCTIONS}',
    getContentCheckInstructions(caseType)
  );
}

// ── Confidence threshold ──

const APPROVE_CONFIDENCE_THRESHOLD = 70;

// ── Main check function ──

export async function checkShareScreenshot(
  screenshotUrl: string,
  caseType: ShareCaseType,
  expectedUserName?: string,
  expectedReferenceCode?: string
): Promise<ScreenshotCheckResult> {
  try {
    const systemPrompt = buildSystemPrompt(caseType);

    let userText = `Analyse this screenshot. Determine if it is a genuine Facebook group post.`;
    if (expectedUserName) {
      userText += ` The expected poster name is "${expectedUserName}".`;
    }
    if (expectedReferenceCode) {
      userText += ` The post should contain a link preview card/image. In the bottom-right corner of that preview image, directly above the "BabyBloom" logo text, there must be a 5-character reference code "${expectedReferenceCode}" in small gray text. Check that this exact code is visible.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: screenshotUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return makeFailResult('AI returned empty response', {});
    }

    const ai = JSON.parse(raw);
    console.log('[checkShareScreenshot] AI result:', JSON.stringify(ai, null, 2));

    // ── Server-side validation — CODE decides, not AI ──

    const checks = {
      is_facebook: ai.is_facebook === true,
      is_group_post: ai.is_group_post === true,
      is_relevant_group: ai.is_relevant_group === true,
      content_matches: ai.content_matches === true,
      is_recent: ai.is_recent === true,
      is_publicly_visible: ai.is_publicly_visible !== false, // default true if not explicitly false
      link_present: ai.link_present === true,
      name_matches: expectedUserName ? ai.name_matches === true : true,
      reference_code_matches: expectedReferenceCode ? ai.reference_code_matches === true : true,
    };

    const confidence: number = typeof ai.confidence === 'number' ? ai.confidence : 0;
    const detectedGroupName: string | null = ai.detected_group_name ?? null;

    // Build internal fail reasons (for admin/logging)
    const failReasons: string[] = [];
    if (!checks.is_facebook) failReasons.push('Not a Facebook screenshot');
    if (!checks.is_group_post) failReasons.push('Not a Facebook group post');
    if (!checks.is_relevant_group) failReasons.push('Group not childcare/parenting related');
    if (!checks.content_matches) failReasons.push('Content does not match expected type');
    if (!checks.is_recent) failReasons.push(`Post not recent (timestamp: ${ai.detected_timestamp ?? 'unknown'})`);
    if (!checks.is_publicly_visible) failReasons.push('Post appears private');
    if (!checks.link_present) failReasons.push('No babybloomsydney.com.au link found');
    if (!checks.name_matches) failReasons.push('Poster name mismatch');
    if (!checks.reference_code_matches) failReasons.push('Reference code not visible in screenshot');

    const allChecksPassed = Object.values(checks).every(Boolean);
    const approved = allChecksPassed && confidence >= APPROVE_CONFIDENCE_THRESHOLD;

    if (!approved && failReasons.length === 0) {
      failReasons.push('Low confidence score');
    }

    // Pick the right user-facing guidance (hard-coded, prioritised)
    const userGuidance = approved ? null : pickGuidance(checks, caseType);

    return {
      verdict: approved ? 'approved' : 'failed',
      confidence,
      checks,
      detected_group_name: detectedGroupName,
      fail_reasons: approved ? [] : failReasons,
      user_guidance: userGuidance,
      ai_raw: ai,
    };
  } catch (error) {
    console.error('[checkShareScreenshot] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return makeFailResult(`AI check error: ${message}`, {});
  }
}

// ── Helpers ──

/** Pick the most relevant user guidance based on which check failed first (priority order) */
function pickGuidance(checks: ScreenshotCheckResult['checks'], caseType: ShareCaseType): string {
  const isBsr = caseType === SHARE_CASE_TYPE.PARENT_BSR;
  const isPosition = caseType === SHARE_CASE_TYPE.PARENT_POSITION;

  if (!checks.is_facebook) {
    if (isBsr) return "Oops! It looks like the image you uploaded isn't of your babysitting position. Try uploading a screenshot of your post in a Facebook group.";
    if (isPosition) return "Oops! It looks like the image you uploaded isn't of your nanny position. Try uploading a screenshot of your post in a Facebook group.";
    return GUIDANCE.not_facebook;
  }
  if (!checks.is_group_post) return GUIDANCE.not_group_post;
  if (!checks.is_publicly_visible) return GUIDANCE.not_visible;
  if (!checks.is_relevant_group) return GUIDANCE.not_relevant_group;
  if (!checks.is_recent) return GUIDANCE.not_recent;
  if (!checks.link_present) return GUIDANCE.no_link;
  if (!checks.content_matches) return GUIDANCE.content_mismatch;
  if (!checks.name_matches) return GUIDANCE.name_mismatch;
  if (!checks.reference_code_matches) {
    if (isBsr) return "We couldn't tell that the post was of your babysitting position. Please make sure that the full post (including the preview image) is visible in your next attempt.";
    if (isPosition) return "We couldn't tell that the post was of your nanny position. Please make sure that the full post (including the preview image) is visible in your next attempt.";
    return GUIDANCE.reference_code_mismatch;
  }
  return GUIDANCE.generic_fallback;
}

function makeFailResult(reason: string, aiRaw: Record<string, unknown>): ScreenshotCheckResult {
  return {
    verdict: 'failed',
    confidence: 0,
    checks: {
      is_facebook: false,
      is_group_post: false,
      is_relevant_group: false,
      content_matches: false,
      is_recent: false,
      is_publicly_visible: false,
      link_present: false,
      name_matches: false,
      reference_code_matches: false,
    },
    detected_group_name: null,
    fail_reasons: [reason],
    user_guidance: GUIDANCE.technical_error,
    ai_raw: aiRaw,
  };
}
