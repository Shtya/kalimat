import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  if (password.length < 6) throw new Error("ADMIN_PASSWORD must be at least 6 characters");

  const passwordHash = await bcrypt.hash(password, 12);
  await db.admin.upsert({
    where: { email },
    create: { email, passwordHash, name: process.env.ADMIN_NAME || "المدرس" },
    update: { passwordHash, name: process.env.ADMIN_NAME || "المدرس" },
  });

  const admins = await db.admin.findMany({ select: { email: true, name: true } });
  console.log(`admin ready: ${email}`);
  console.log(`admins in db: ${admins.map((a) => a.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
