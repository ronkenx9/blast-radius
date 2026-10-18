import Landing from "@/components/Landing";
import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<{ advisory?: string | string[] }> }) {
  const query = await searchParams;
  // Preserve incident links sent before the explanatory landing page was added.
  if (typeof query.advisory === "string" && query.advisory) redirect(`/app?advisory=${encodeURIComponent(query.advisory)}`);
  return <Landing/>;
}
