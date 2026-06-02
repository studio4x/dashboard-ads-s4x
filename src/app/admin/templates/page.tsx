import type { Metadata } from "next";
import { TemplatesManager } from "@/components/admin/TemplatesManager";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return <TemplatesManager />;
}
