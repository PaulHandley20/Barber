import type { ReactNode } from "react";
type PanelProps = { children: ReactNode; className?: string; muted?: boolean; elevated?: boolean; };
export default function Panel({ children, className="", muted=false, elevated=false }: PanelProps) {
  return <section className={[
    "group relative overflow-hidden rounded-[14px] border transition-colors duration-200",
    muted ? "border-white/[0.055] bg-white/[0.012]" : "border-white/[0.07] bg-[#0B0B0B]",
    "shadow-none",
    "hover:border-white/[0.095]", className
  ].join(" ")}>{children}</section>;
}
