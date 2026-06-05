import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Life Score · Self-Khilafah",
  description: "Holistic weekly life score across Faith, Knowledge, Health, Character and Mission.",
};

export default function LifeScoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}