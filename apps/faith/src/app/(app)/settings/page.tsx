import { SettingsClient } from "./SettingsClient";
import { db } from "@/db";
import { settings } from "@/db/schema";

export default async function SettingsPage() {
  const rows = await db.select().from(settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return <SettingsClient initialSettings={map} />;
}
