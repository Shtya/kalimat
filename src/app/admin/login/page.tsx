import { redirect } from "next/navigation";
import { getAdmin } from "@/server/services/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand" style={{ marginBottom: 6 }}>
          <span className="brand-mark" aria-hidden>
            ك
          </span>
          كلمات قرآنية
        </div>
        <h1 style={{ margin: "10px 0 2px", fontSize: "1.4rem" }}>لوحة تحكم المدرس</h1>
        <p className="muted" style={{ margin: "0 0 18px" }}>
          سجّل الدخول لإدارة المحتوى ومتابعة الطلاب.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
