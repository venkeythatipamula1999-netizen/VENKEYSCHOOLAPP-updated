"use client";
// src/components/layout/Sidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/context/AdminContext";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard",       icon: "📊", label: "Dashboard",       section: "core" },
  { href: "/schools",         icon: "🏫", label: "Schools",         section: "core" },
  { href: "/teachers",        icon: "👩‍🏫", label: "Teachers",        section: "core" },
  { href: "/students",        icon: "🎓", label: "Students",         section: "core" },
  { href: "/parents",         icon: "👥", label: "Parents",          section: "core" },
  { href: "/analytics",       icon: "📊", label: "School Analytics", section: "academic" },
  { href: "/classes",         icon: "📚", label: "Classes",          section: "academic" },
  { href: "/marks-audit",     icon: "🔍", label: "Marks Audit",      section: "academic" },
  { href: "/timetable",       icon: "📅", label: "Timetable",        section: "academic" },
  { href: "/leaves",          icon: "📋", label: "Leaves",           section: "academic" },
  { href: "/trips",           icon: "🚌", label: "Bus Trips",        section: "operations" },
  { href: "/salary",          icon: "💰", label: "Salaries",         section: "operations" },
  { href: "/fees",            icon: "🧾", label: "Fees",             section: "operations" },
  { href: "/system-health",   icon: "🚨", label: "System Health",    section: "system" },
  { href: "/whatsapp",        icon: "💬", label: "WhatsApp Monitor", section: "system" },
  { href: "/notifications",   icon: "🔔", label: "Notifications",    section: "system" },
  { href: "/feature-control", icon: "🎛️", label: "Feature Control",  section: "system" },
  { href: "/settings",        icon: "⚙️", label: "Settings",         section: "system" },
];
const SECTIONS = [
  { key: "core",       label: "Core" },
  { key: "academic",   label: "Academic" },
  { key: "operations", label: "Operations" },
  { key: "system",     label: "System" },
];

export default function Sidebar() {
  const pathname     = usePathname();
  const { user, logout, unreadCount } = useAdmin();

  return (
    <aside className="w-[230px] min-w-[230px] bg-navy flex flex-col h-screen overflow-y-auto border-r border-white/[0.04]">
      {/* Logo */}
      <div className="px-4 py-[18px] border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gold rounded-[10px] flex items-center justify-center text-[17px] font-black text-navy flex-shrink-0">S</div>
          <div>
            <div className="text-white font-extrabold text-[13px]">Vidhaya Layam</div>
            <div className="text-white/35 text-[9.5px] tracking-wide uppercase">Super Admin</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 bg-brand-emerald/10 border border-brand-emerald/20 rounded-md px-2.5 py-1">
          <span className="w-1.5 h-1.5 bg-brand-emerald rounded-full" />
          <span className="text-brand-emerald text-[10px] font-semibold">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1">
        {SECTIONS.map(sec => (
          <div key={sec.key} className="pt-2.5 pb-1">
            <div className="px-[18px] pb-1 text-[9px] font-bold tracking-widest uppercase text-white/25">{sec.label}</div>
            {NAV.filter(n => n.section === sec.key).map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}
                  className={clsx(
                    "flex items-center gap-2.5 mx-1.5 my-[1px] px-[14px] py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150 border-l-[3px]",
                    active
                      ? "bg-gold/[0.12] text-gold border-gold font-semibold"
                      : "text-white/55 border-transparent hover:bg-white/[0.06] hover:text-white/85"
                  )}>
                  <span className="text-sm w-[17px] text-center">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="bg-brand-rose text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.04] rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-[12px] font-extrabold text-navy flex-shrink-0">
            {(user?.email || "A")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[11.5px] font-semibold truncate">{user?.email}</div>
            <button onClick={logout} className="text-white/35 text-[9.5px] hover:text-brand-rose transition cursor-pointer">
              🚪 Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
