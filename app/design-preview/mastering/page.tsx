import { notFound } from "next/navigation";
import SonicDesignPreview from "@/components/SonicDesignPreview";
export const metadata = { robots: { index: false, follow: false } };
export default function MasteringDesignPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <SonicDesignPreview />;
}
