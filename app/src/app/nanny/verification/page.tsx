import { getVerificationData } from "@/lib/actions/verification";
import { VerificationPageClient } from "./VerificationPageClient";

export default async function NannyVerificationPage() {
  const { data: verification } = await getVerificationData();

  return <VerificationPageClient initialData={verification} />;
}
