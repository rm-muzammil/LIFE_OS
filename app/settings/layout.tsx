import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings · Self-Khilafah",
  description: "Connect external apps and configure feed URLs.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}