import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const admin = email ? await db.admin.findUnique({ where: { email } }) : null;
  const ok = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
  console.log(ok ? "login-check: ok" : "login-check: failed");
  if (!ok) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
