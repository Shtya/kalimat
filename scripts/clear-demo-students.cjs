const { createHash, randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

for (const line of readFileSync(join(__dirname, "..", ".env"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (!match || process.env[match[1].trim()]) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  process.env[match[1].trim()] = value;
}

const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  await db.$executeRawUnsafe(`ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "phone" TEXT`);
  await db.$executeRawUnsafe(`ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "email" TEXT`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Student_phone_key" ON "Student"("phone")`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Student_email_key" ON "Student"("email")`);

  const deletedProgress = await db.progress.deleteMany();
  const deletedStudents = await db.student.deleteMany();
  const [grades, categories, words, students] = await Promise.all([
    db.grade.count(),
    db.category.count(),
    db.word.count(),
    db.student.count(),
  ]);

  const migrationName = "20261030200000_student_contact";
  const checksum = createHash("sha256")
    .update(readFileSync(join(__dirname, "..", "prisma", "migrations", migrationName, "migration.sql")))
    .digest("hex");
  const existing = await db.$queryRawUnsafe(
    `SELECT "migration_name" FROM "_prisma_migrations" WHERE "migration_name" = $1`,
    migrationName,
  );
  if (!Array.isArray(existing) || existing.length === 0) {
    await db.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
       VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
      randomUUID(),
      checksum,
      migrationName,
    );
  }

  console.log(
    JSON.stringify({
      deletedProgress: deletedProgress.count,
      deletedStudents: deletedStudents.count,
      remaining: { grades, categories, words, students },
    }),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exit(1);
  })
  .finally(() => db.$disconnect());
