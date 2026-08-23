import type { Metadata } from "next";
import { renderIntentPage, intentMetadata } from "@/components/directory/IntentPage";

export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  return intentMetadata(city, "tiffin-service");
}

export default async function Page({ params }: Props) {
  const { city } = await params;
  return renderIntentPage(city, "tiffin-service");
}
