import type { ReactNode } from "react";
type Props={children:ReactNode;tone?:"neutral"|"brand"|"success"|"warning"|"danger";dot?:boolean};
export default function Badge({children,tone="neutral",dot=false}:Props){
 const styles={neutral:"border-white/[0.08] bg-white/[0.035] text-[#A1A1AA]",brand:"border-[#FF5A00]/20 bg-[#FF5A00]/[0.08] text-[#FF7A32]",success:"border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-400",warning:"border-amber-400/15 bg-amber-400/[0.06] text-amber-400",danger:"border-red-400/15 bg-red-400/[0.05] text-red-300"};
 const dots={neutral:"bg-zinc-500",brand:"bg-[#FF5A00]",success:"bg-emerald-400",warning:"bg-amber-400",danger:"bg-red-400"};
 return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-medium tracking-[0.01em] ${styles[tone]}`}>{dot&&<span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`}/>} {children}</span>;
}
