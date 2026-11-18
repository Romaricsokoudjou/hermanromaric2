import { notFound } from "next/navigation";
import { LegalPage } from "@/components/LegalPage";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^legal\.[a-z]+$/.test(slug)) notFound();
  return <LegalPage contentKey={slug} />;
}
