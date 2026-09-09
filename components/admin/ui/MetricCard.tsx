import type { ReactNode } from "react";
type Props = { label:string; value:string; detail?:string; delta?:string; deltaTone?:"positive"|"negative"|"neutral"; icon?:ReactNode; accent?:boolean; };
export default function MetricCard({label,value,detail,delta,deltaTone="neutral",icon,accent=false}:Props) {
  const deltaClass = deltaTone==="positive" ? "text-[#22C55E]" : deltaTone==="negative" ? "text-[#EF4444]" : "text-[#71717A]";
  return <article className={[
    "group relative min-h-[126px] overflow-hidden rounded-[14px] border p-5 transition-all duration-200",
    accent ? "border-[#FF5A00]/25 bg-[#FF5A00]/[0.055] shadow-[0_12px_34px_rgba(255,90,0,0.06)]" : "border-white/[0.07] bg-[#0B0B0B] hover:border-white/[0.11] hover:bg-[#101010]"
  ].join(" ")}>
    <div className="flex items-start justify-between"><span className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#71717A]">{label}</span>{icon && <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#A1A1AA] transition-colors group-hover:border-white/[0.10] group-hover:text-[#D4D4D8]">{icon}</div>}</div>
    <div className="mt-5 flex items-end gap-2"><span className="font-[var(--font-sora)] text-[26px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[#F5F5F4]">{value}</span>{delta && <span className={`mb-0.5 text-[10px] font-medium tabular-nums ${deltaClass}`}>{delta}</span>}</div>
    {detail && <p className="mt-2 text-[10px] text-[#71717A]">{detail}</p>}
    {accent && <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-[#FF5A00]/65 to-transparent opacity-80" />}
  </article>;
}
