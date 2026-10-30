import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

export const ADMIN_COOKIE = "adm";
const SESSION_DAYS = 7;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | undefined;

export async function verifyCredentials(email: string, password: string) {
  const admin = await db.admin.findUnique({ where: { email } });
  dummyHash ??= bcrypt.hash("not-a-real-password", 12);
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? (await dummyHash));
  return ok && admin ? admin : null;
}

export async function createSession(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.adminSession.create({ data: { tokenHash: hashToken(token), adminId, expiresAt } });
  // Opportunistic cleanup of expired sessions.
  await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(ADMIN_COOKIE);
}

export const getAdmin = cache(async () => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, admin: { select: { id: true, name: true, email: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.admin;
});

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
