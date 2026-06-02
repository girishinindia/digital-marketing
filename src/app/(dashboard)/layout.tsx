import { redirect } from "next/navigation";
import { getCurrentUser, loadUserById } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // If the company/account was deleted, the JWT is still valid — verify in the DB and bounce.
  const fresh = await loadUserById(user.id);
  if (!fresh) redirect("/login?reason=removed");

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-surface-page">
        <Sidebar role={fresh.roleSlug} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={fresh} />
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
