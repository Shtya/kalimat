import { AdminNav } from "@/components/admin/AdminNav";
import { Icon } from "@/components/play/Icon";
import { requireAdmin } from "@/server/services/auth";
import { logoutAction } from "../actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="brand-mark" aria-hidden>
            ك
          </span>
          <span>
            كلمات قرآنية
            <small>لوحة المدرس</small>
          </span>
        </div>
        <AdminNav />
        <div className="adm-user">
          <span className="adm-avatar" aria-hidden>
            {Array.from(admin.name)[0]}
          </span>
          <span className="adm-user-text">
            <b>{admin.name}</b>
            <small>{admin.email}</small>
          </span>
          <form action={logoutAction}>
            <button className="adm-logout" aria-label="تسجيل الخروج" title="تسجيل الخروج">
              <Icon name="logout" size={20} />
            </button>
          </form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
