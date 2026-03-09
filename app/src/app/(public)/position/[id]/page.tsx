import { getPublicPositionProfile } from "@/lib/actions/matching";
import { PositionJobView } from "./PositionJobView";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { data: position } = await getPublicPositionProfile(params.id);

  if (!position) {
    return { title: "Job Not Found | Baby Bloom Sydney" };
  }

  const suburb = position.suburb ?? "Sydney";
  const surname = position.parentLastName ?? position.parentFirstName;
  const title = `The ${surname} family is looking for a nanny | apply now`;
  const daysStr = position.daysRequired?.join(", ") ?? "";
  const description = daysStr
    ? `Nanny needed in ${suburb}. ${daysStr}. $${position.hourlyRate ?? 40}/hr. Apply on Baby Bloom Sydney.`
    : `Nanny needed in ${suburb}. $${position.hourlyRate ?? 40}/hr. Apply on Baby Bloom Sydney.`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app-babybloom.vercel.app";
  const ogImageUrl = `${siteUrl}/api/og/position/${params.id}`;
  const pageUrl = `${siteUrl}/position/${params.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: pageUrl,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    other: {
      "fb:app_id": "4009164676060901",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PositionPublicPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: position, error } = await getPublicPositionProfile(params.id);

  if (error || !position) {
    notFound();
  }

  return <PositionJobView position={position} />;
}
