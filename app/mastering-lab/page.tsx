import type { Metadata } from "next";
import MasteringLab from "@/components/mastering-lab/MasteringLab";

export const metadata: Metadata = {
  title: "Mastering Lab – Vorschau",
  robots: { index: false, follow: true },
};

export default function MasteringLabPage() {
  return <MasteringLab lang="de" />;
}
