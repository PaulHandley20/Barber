import type { ReactNode } from "react";
type Props={title:string;description?:string;action?:ReactNode};
export default function SectionHeader({title,description,action}:Props){return <div className="flex items-end justify-between gap-4"><div><h2 className="font-[var(--font-sora)] text-[13px] font-semibold tracking-[-0.02em] text-[#F5F5F4]">{title}</h2>{description&&<p className="mt-1 text-[10px] leading-4 text-[#71717A]">{description}</p>}</div>{action}</div>}
