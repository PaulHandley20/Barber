import type { ButtonHTMLAttributes, ReactNode } from "react";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?:"primary"|"secondary"|"ghost"|"danger"; size?:"sm"|"md"|"lg"; icon?:ReactNode; };
export default function Button({variant="secondary",size="md",icon,className="",children,...props}:Props) {
  const variants={primary:"border border-[#FF5A00] bg-[#FF5A00] text-white shadow-[0_10px_28px_rgba(255,90,0,0.14)] hover:border-[#FF6A18] hover:bg-[#FF6A18] hover:shadow-[0_12px_34px_rgba(255,90,0,0.18)]",secondary:"border border-white/[0.09] bg-white/[0.035] text-[#F5F5F4] hover:border-white/[0.13] hover:bg-white/[0.06]",ghost:"border border-transparent text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#F5F5F4]",danger:"border border-red-400/15 bg-red-400/[0.05] text-red-300 hover:border-red-400/25 hover:bg-red-400/[0.09]"};
  const sizes={sm:"h-8 rounded-lg px-3 text-[10px]",md:"h-9 rounded-[10px] px-3.5 text-[11px]",lg:"h-10 rounded-[11px] px-4 text-[11px]"};
  return <button {...props} className={["inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-40","focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00]/30",variants[variant],sizes[size],className].join(" ")}>{icon}{children}</button>;
}
