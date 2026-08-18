import { notFound } from "next/navigation";
import BeforeAfterShowcase from "@/components/BeforeAfterShowcase";

export default function BeforeAfterDesignPreview() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-screen bg-[#070918] py-8">
      <BeforeAfterShowcase lang="de" />
    </main>
  );
}
