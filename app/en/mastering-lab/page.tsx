import type { Metadata } from "next";
import MasteringLab from "@/components/mastering-lab/MasteringLab";

export const metadata: Metadata = {
  title: "Mastering Lab – Preview",
  robots: { index: false, follow: true },
};

export default function EnglishMasteringLabPage() {
  return <MasteringLab lang="en" />;
}
