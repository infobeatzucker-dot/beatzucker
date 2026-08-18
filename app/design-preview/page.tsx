import { notFound } from "next/navigation";
import DashboardDesignPreview from "@/components/dashboard/DashboardDesignPreview";

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DashboardDesignPreview />;
}
