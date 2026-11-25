import { tr } from "../../i18n/runtime";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function BottomSheet({ title, onClose, children }: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const dialog = ref.current;
        dialog?.showModal();
        return () => { dialog?.close(); previous?.focus({ preventScroll: true }); };
    }, []);
    return <dialog ref={ref} className="bottom-sheet" aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) {
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
            onClose();
    } }}>
    <div className="sheet-handle"/><div className="sheet-heading"><h2>{title}</h2><button aria-label={tr("Eingabe schlie\u00DFen")} onClick={onClose}><X size={20}/></button></div>{children}
  </dialog>;
}
