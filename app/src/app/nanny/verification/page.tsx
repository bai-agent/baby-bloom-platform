import { getVerificationStatus } from "@/lib/actions/verification";
import { VerificationStatusClient } from "./VerificationStatusClient";

export default async function NannyVerificationPage() {
  const { data: verification } = await getVerificationStatus();

  return (
    <VerificationStatusClient
      initialStatus={verification?.verification_status ?? null}
      identityRejectionReason={verification?.identity_rejection_reason ?? null}
      wwccRejectionReason={verification?.wwcc_rejection_reason ?? null}
      wwccExpiryDate={verification?.wwcc_expiry_date ?? null}
      wwccNumber={verification?.wwcc_number ?? null}
    />
  );
}
