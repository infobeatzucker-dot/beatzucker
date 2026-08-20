import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Admin – Beatzucker" },
  robots: { index: false, follow: false },
  alternates: { canonical: "https://beatzucker.de/admin" },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
