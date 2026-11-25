import { type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
export function ActionMenu({ label, children }: {
    label: string;
    children: ReactNode;
}) {
    return <details className="context-menu"><summary aria-label={label}><MoreHorizontal size={20}/></summary>{children}</details>;
}
