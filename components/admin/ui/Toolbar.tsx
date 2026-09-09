import type { ReactNode } from "react";
type Props={left?:ReactNode;right?:ReactNode};
export default function Toolbar({left,right}:Props){return <div className="flex flex-col gap-2.5 rounded-[12px] border border-white/[0.07] bg-[#0B0B0B] p-2.5 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 flex-1 items-center gap-2">{left}</div><div className="flex shrink-0 items-center gap-2">{right}</div></div>}
