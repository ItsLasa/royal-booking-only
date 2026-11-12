import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-panel-root font-open-sans font-normal" data-admin-root>
      {children}
    </div>
  );
}
