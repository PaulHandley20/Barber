import type { ReactNode } from "react";
type Props = { eyebrow?: string; title: string; description?: string; actions?: ReactNode; meta?: ReactNode; };
export default function PageHeader({ eyebrow, title, description, actions, meta }: Props) {
  return <header className="flex flex-col gap-5 border-b border-white/[0.055] pb-7 pt-1 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0">
      {eyebrow && <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5A00]"><span className="h-1.5 w-1.5 rounded-full bg-[#FF5A00]" />{eyebrow}</div>}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-[var(--font-sora)] text-[30px] font-semibold leading-none tracking-[-0.045em] text-[#F5F5F4] md:text-[36px]">{title}</h1>{meta}
      </div>
      {description && <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[#A1A1AA]">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>;
}
