import { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
