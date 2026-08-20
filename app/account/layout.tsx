import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Mein Konto – Beatzucker" },
  robots: { index: false, follow: false },
  alternates: { canonical: "https://beatzucker.de/account" },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
