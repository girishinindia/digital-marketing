"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RoleSlug } from "@/types";

type NavItem = { href: string; label: string; roles: RoleSlug[]; icon: string };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["super_admin", "company_admin", "user"], icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/companies", label: "Companies", roles: ["super_admin"], icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01" },
  { href: "/admins", label: "Company Admins", roles: ["super_admin"], icon: "M16 11a4 4 0 10-8 0 4 4 0 008 0zM3 21a7 7 0 0118 0" },
  { href: "/platforms", label: "Platforms", roles: ["super_admin"], icon: "M4 5h16v10H4zM2 19h20" },
  { href: "/content-types", label: "Content Types", roles: ["super_admin"], icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/post-types", label: "Post Types", roles: ["super_admin"], icon: "M7 4h10v16l-5-3-5 3z" },
  { href: "/users", label: "Team", roles: ["company_admin"], icon: "M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M12 10a4 4 0 100-8 4 4 0 000 8z" },
  { href: "/content-library", label: "Content Library", roles: ["super_admin", "company_admin"], icon: "M4 5a2 2 0 012-2h11v16H6a2 2 0 01-2-2zM9 3v16" },
  { href: "/calendar", label: "Calendar", roles: ["super_admin", "company_admin"], icon: "M3 8h18M7 3v3M17 3v3M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" },
  { href: "/studio", label: "AI Studio", roles: ["company_admin", "user"], icon: "M12 3l1.9 4.8L19 9l-4 3.3L16 18l-4-2.7L8 18l1-5.7L5 9l5.1-1.2z" },
  { href: "/posts", label: "Posts", roles: ["company_admin", "user"], icon: "M4 4h16v12H8l-4 4z" },
];

export function Sidebar({ role }: { role: RoleSlug }) {
  const pathname = usePathname();
  // Super admin sees every menu item; other roles only what they're allowed.
  const items = role === "super_admin" ? NAV : NAV.filter((n) => n.roles.includes(role));
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-surface-line bg-white px-3 py-5 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-royal-600 text-white">◈</div>
        <div className="text-sm font-medium leading-tight text-ink">
          {process.env.NEXT_PUBLIC_APP_NAME || "Marketing"}
          <span className="block text-xs font-normal text-ink-soft">AI Social Suite</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-royal-50 font-medium text-royal-700" : "text-ink-muted hover:bg-royal-50/60 hover:text-royal-700"
              }`}
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-3 text-[11px] text-ink-soft">v0.1 · {role.replace("_", " ")}</p>
    </aside>
  );
}
