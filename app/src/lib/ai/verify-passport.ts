import { openai } from './client';

export interface PassportVerificationResult {
  pass: boolean;
  extracted: {
    surname: string | null;
    given_names: string | null;
    dob: string | null;
    nationality: string | null;
    passport_number: string | null;
    expiry: string | null;
  };
  reasoning: string;
  issues: string[];
}

const PASSPORT_SYSTEM_PROMPT = `You are an identity verification specialist. Your job is to analyse a passport image and a selfie/identification photo, compare them to submitted details, and determine if this is a legitimate identity verification.

Follow this 10-step chain-of-thought process:

1. DOCUMENT ANALYSIS: Examine the passport image. Is it a real passport document? Look for standard passport features (MRZ zone, photo, biographical data page). Note the issuing country.

2. DATA EXTRACTION: Extract the following fields from the passport:
   - Surname
   - Given names
   - Date of birth (format as YYYY-MM-DD)
   - Nationality
   - Passport number
   - Expiry date (format as YYYY-MM-DD)

3. COUNTRY-SPECIFIC VALIDATION: Based on the issuing country, check:
   - Australian passports: navy blue cover, coat of arms, "AUSTRALIA" text
   - UK passports: burgundy/blue cover, crown emblem
   - US passports: navy blue cover, eagle emblem
   - Other: appropriate national symbols and formatting

4. PHOTO QUALITY: Is the passport image clear enough to read? Are all biographical details legible? Is the MRZ zone visible?

5. SELFIE COMPARISON: Compare the selfie/identification photo to the passport photo. Do they appear to be the same person? Consider:
   - Similar facial features
   - Approximate age match
   - Not an obvious photo of a screen/printout

6. NAME MATCHING: Compare extracted name to submitted name. Be LENIENT:
   - Minor spelling differences are OK
   - Middle names present on passport but NOT submitted is completely fine — many people omit middle names
   - Middle names submitted but NOT on passport is also fine
   - Different ordering of given names is OK
   - Shortened/nickname versions of first names are OK (e.g. "Bill" vs "William", "Kate" vs "Katherine")
   - Only flag if the SURNAME is completely different or the FIRST name has no reasonable connection

7. DOB MATCHING: Compare extracted date of birth to submitted date of birth. Must be an exact match.

8. NATIONALITY MATCHING: Compare extracted nationality to submitted passport country. Must be consistent.

9. EXPIRY CHECK: Is the passport expired? If the expiry date has passed, flag this as an issue.

10. FINAL ASSESSMENT: Based on all above checks, determine pass/fail.

PASS if:
- Document appears genuine
- Photo match is reasonable
- Name matches (allowing minor variations)
- DOB matches exactly
- Passport is not expired

FAIL if:
- Document appears fake, altered, or unreadable
- Photos clearly don't match
- Names are completely different
- DOB doesn't match
- Passport is expired
- Image is too blurry/dark to verify

Respond with ONLY valid JSON in this exact format:
{
  "pass": true/false,
  "extracted": {
    "surname": "...",
    "given_names": "...",
    "dob": "YYYY-MM-DD",
    "nationality": "...",
    "passport_number": "...",
    "expiry": "YYYY-MM-DD"
  },
  "reasoning": "Step-by-step reasoning...",
  "issues": ["issue 1", "issue 2"]
}

If the document is completely unreadable, still return the JSON format with pass: false, null extracted fields, and appropriate issues listed.`;

export async function verifyPassport(
  passportSignedUrl: string,
  selfieSignedUrl: string,
  submittedData: {
    surname: string;
    given_names: string;
    date_of_birth: string;
    passport_country: string;
  }
): Promise<PassportVerificationResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PASSPORT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Submitted details:\n- Surname: ${submittedData.surname}\n- Given Names: ${submittedData.given_names}\n- Date of Birth: ${submittedData.date_of_birth}\n- Passport Country: ${submittedData.passport_country}\n\nPlease verify the passport image and selfie below.`,
            },
            {
              type: 'image_url',
              image_url: { url: passportSignedUrl, detail: 'high' },
            },
            {
              type: 'image_url',
              image_url: { url: selfieSignedUrl, detail: 'high' },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return {
        pass: false,
        extracted: { surname: null, given_names: null, dob: null, nationality: null, passport_number: null, expiry: null },
        reasoning: 'AI returned empty response',
        issues: ['AI analysis failed — empty response'],
      };
    }

    const parsed = JSON.parse(raw);

    return {
      pass: !!parsed.pass,
      extracted: {
        surname: parsed.extracted?.surname ?? null,
        given_names: parsed.extracted?.given_names ?? null,
        dob: parsed.extracted?.dob ?? null,
        nationality: parsed.extracted?.nationality ?? null,
        passport_number: parsed.extracted?.passport_number ?? null,
        expiry: parsed.extracted?.expiry ?? null,
      },
      reasoning: parsed.reasoning ?? '',
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch (error) {
    console.error('[verifyPassport] AI analysis failed:', error);
    return {
      pass: false,
      extracted: { surname: null, given_names: null, dob: null, nationality: null, passport_number: null, expiry: null },
      reasoning: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      issues: ['AI analysis failed — please review manually'],
    };
  }
}
