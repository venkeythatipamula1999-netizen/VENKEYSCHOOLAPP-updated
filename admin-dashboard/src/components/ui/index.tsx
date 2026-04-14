"use client";
// src/components/ui/index.tsx
import clsx from "clsx";
import { ReactNode, useState } from "react";

// ── CARD ──────────────────────────────────────────────────────
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, count, children }: { title: string; count?: number; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
      <div className="text-navy font-extrabold text-[14px] flex-1">{title}</div>
      {count !== undefined && (
        <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-2.5 py-0.5 rounded-full">{count}</span>
      )}
      {children}
    </div>
  );
}

// ── METRIC CARD ───────────────────────────────────────────────
export function MetricCard({ icon, bg, value, label, sub }: {
  icon: string; bg: string; value: string | number; label: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card hover:shadow-card-hover transition-shadow">
      <div className={clsx("w-10 h-10 rounded-[10px] flex items-center justify-center text-xl mb-3")} style={{ background: bg }}>
        {icon}
      </div>
      <div className="text-[28px] font-black text-navy leading-none">{value}</div>
      <div className="text-[11px] text-slate-500 font-medium mt-1.5">{label}</div>
      {sub && <div className="text-[9.5px] text-slate-400 mt-1.5 flex items-center gap-1">⚡ {sub}</div>}
    </div>
  );
}

// ── STATUS BADGE ──────────────────────────────────────────────
const badgeStyles: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-600",
  inactive:  "bg-slate-100 text-slate-500",
  suspended: "bg-rose-50 text-rose-600",
  present:   "bg-emerald-50 text-emerald-600",
  absent:    "bg-rose-50 text-rose-600",
  Pending:   "bg-amber-50 text-amber-600",
  Approved:  "bg-emerald-50 text-emerald-600",
  Rejected:  "bg-rose-50 text-rose-600",
  completed: "bg-blue-50 text-blue-600",
  paid:      "bg-emerald-50 text-emerald-600",
  unpaid:    "bg-rose-50 text-rose-600",
  morning:   "bg-amber-50 text-amber-600",
  evening:   "bg-purple-50 text-purple-600",
};

export function Badge({ status }: { status?: string }) {
  const s = status || "unknown";
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold", badgeStyles[s] || "bg-slate-100 text-slate-500")}>
      {s === "active" || s === "present" ? "● " : ""}{s}
    </span>
  );
}

export function SubjectBadge({ label }: { label: string }) {
  return <span className="bg-brand-teal/10 text-brand-teal text-[10.5px] font-semibold px-2 py-0.5 rounded">{label}</span>;
}

export function ClassBadge({ label }: { label: string }) {
  return <span className="bg-violet-100 text-violet-600 text-[10.5px] font-semibold px-2 py-0.5 rounded">{label}</span>;
}

// ── BUTTON ────────────────────────────────────────────────────
type BtnVariant = "primary" | "gold" | "outline" | "danger" | "sm" | "teal";
const btnStyles: Record<BtnVariant, string> = {
  primary: "bg-navy text-white border-transparent hover:bg-navy-mid",
  gold:    "bg-gold text-navy font-bold border-transparent hover:bg-gold-light",
  outline: "bg-white text-navy border-slate-200 hover:border-navy",
  danger:  "bg-rose-50 text-brand-rose border-rose-200 hover:bg-rose-100",
  sm:      "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
  teal:    "bg-brand-teal/10 text-brand-teal border-brand-teal/30 hover:bg-brand-teal/20",
};
export function Btn({ variant = "sm", onClick, children, className, disabled }: {
  variant?: BtnVariant; onClick?: () => void; children: ReactNode; className?: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-all disabled:opacity-50",
        btnStyles[variant], className
      )}
    >{children}</button>
  );
}

// ── AVATAR ────────────────────────────────────────────────────
export function Avatar({ name, bg = "#1a3a5c" }: { name?: string; bg?: string }) {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
      style={{ background: bg }}>
      {((name || "?")[0]).toUpperCase()}
    </div>
  );
}

// ── TOGGLE ────────────────────────────────────────────────────
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={clsx("relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors flex-shrink-0",
        on ? "bg-brand-emerald" : "bg-slate-300")}
    >
      <div className={clsx("absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-all",
        on ? "left-[21px]" : "left-[3px]")} />
    </button>
  );
}

// ── FILTER INPUT ──────────────────────────────────────────────
export function FilterInput({ placeholder, value, onChange }: {
  placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="border border-slate-200 bg-white px-3 py-2 rounded-lg text-[12px] text-navy outline-none focus:border-brand-teal transition w-52 font-sans"
    />
  );
}

export function FilterSelect({ options, value, onChange }: {
  options: [string, string][]; value: string; onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-slate-200 bg-white px-3 py-2 rounded-lg text-[12px] text-navy outline-none focus:border-brand-teal transition cursor-pointer font-sans"
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// ── TABLE ─────────────────────────────────────────────────────
export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="bg-slate-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={clsx("hover:bg-slate-50 transition-colors", onClick && "cursor-pointer")}>
      {children}
    </tr>
  );
}

export function Td({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return (
    <td className={clsx("px-4 py-3 border-b border-slate-100 text-[12.5px] text-slate-700 align-middle", mono && "font-mono text-[11px] text-slate-500")}>
      {children}
    </td>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────
export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <tr>
      <td colSpan={99} className="text-center py-14 text-slate-400">
        <div className="text-4xl mb-2">{icon}</div>
        <div className="text-[13px]">{message}</div>
      </td>
    </tr>
  );
}

// ── LIVE INDICATOR ────────────────────────────────────────────
export function LiveBadge({ collection }: { collection: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-brand-emerald font-semibold">
      <span className="w-1.5 h-1.5 bg-brand-emerald rounded-full animate-pulse" />
      {collection}
    </span>
  );
}

// ── MODAL ─────────────────────────────────────────────────────
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-modal animate-slide-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-navy text-[17px] font-extrabold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-navy text-xl leading-none cursor-pointer">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function FormInput({ placeholder, value, onChange, type = "text" }: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-slate-200 bg-slate-50 px-3.5 py-2.5 rounded-xl text-[13px] text-navy outline-none focus:border-brand-teal focus:bg-white transition font-sans"
    />
  );
}

// ── SECTION FILTER BAR ────────────────────────────────────────
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 border-b border-slate-100 flex-wrap">
      {children}
    </div>
  );
}

// ── MARKS DIFF ────────────────────────────────────────────────
export function MarksDiff({ oldVal, newVal }: { oldVal?: number; newVal?: number }) {
  const delta = (newVal ?? 0) - (oldVal ?? 0);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-brand-rose font-bold line-through text-[12px]">{oldVal ?? "—"}</span>
      <span className="text-slate-400 text-xs">→</span>
      <span className="text-brand-emerald font-bold text-[12px]">{newVal ?? "—"}</span>
      <span className={clsx("text-[11px] font-bold ml-0.5", delta > 0 ? "text-brand-emerald" : delta < 0 ? "text-brand-rose" : "text-slate-400")}>
        ({delta > 0 ? "+" : ""}{delta})
      </span>
    </div>
  );
}
