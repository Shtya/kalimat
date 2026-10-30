import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/server/services/auth";
import { logoutAction } from "../actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ك
          </span>
          كلمات قرآنية
        </div>
        <AdminNav />
        <div className="adm-user">
          <b>{admin.name}</b>
          <small>{admin.email}</small>
          <form action={logoutAction} style={{ marginTop: 8 }}>
            <button className="abtn abtn-light abtn-sm">تسجيل الخروج</button>
          </form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
