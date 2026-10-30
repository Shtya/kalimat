import { rmSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { isValidGameWord } from "../src/lib/arabic";
import { CURRICULUM } from "../src/lib/quran/curriculum";
import { SURAHS } from "../src/lib/quran/surahs";
import { SAMPLE_LEVELS, SAMPLE_STAGE } from "./seed-content";

const db = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.admin.upsert({
    where: { email },
    create: { email, passwordHash, name: process.env.ADMIN_NAME || "المدرس" },
    update: { passwordHash },
  });
  console.log(`✔ admin ${email}`);
}

/** The 114 surahs and the 6 stations × 4 stages matrix. */
async function seedCurriculum() {
  await db.surah.createMany({ data: SURAHS });

  for (const station of CURRICULUM) {
    const { id: stationId } = await db.station.create({
      data: { order: station.order, title: station.title, goal: station.goal, icon: station.icon, color: station.color },
    });
    for (const stage of station.stages) {
      await db.stage.create({
        data: {
          stationId,
          number: stage.number,
          title: stage.title,
          valueCluster: stage.valueCluster,
          surahs: { create: stage.surahs.map((s, i) => ({ surahNumber: s.surah, order: i + 1, fromAyah: s.fromAyah, toAyah: s.toAyah })) },
        },
      });
    }
  }
  console.log(`✔ ${SURAHS.length} surahs, ${CURRICULUM.length} stations, ${await db.stage.count()} stages`);
}

/** Demo levels for stage 1 so every game type can be tried before the real sheet is uploaded. */
async function seedSample() {
  const stage = await db.stage.findUniqueOrThrow({ where: { number: SAMPLE_STAGE } });
  for (const [i, level] of SAMPLE_LEVELS.entries()) {
    for (const item of level.items) if (!isValidGameWord(item.text)) throw new Error(`Invalid seed word: ${item.text}`);
    await db.level.create({
      data: {
        stageId: stage.id,
        surahNumber: level.surah,
        title: level.title,
        order: i + 1,
        type: level.type,
        difficulty: level.difficulty,
        status: "PUBLISHED",
        words: {
          create: level.items.map((it, k) => ({
            text: it.text,
            hint: it.hint,
            fact: it.fact,
            kind: it.kind,
            surahNumber: it.surah,
            ayah: it.ayah,
            order: k + 1,
          })),
        },
      },
    });
  }
  console.log(`✔ ${SAMPLE_LEVELS.length} sample levels in stage ${SAMPLE_STAGE}, ${await db.word.count()} questions`);
}

async function main() {
  // Content is reseeded from scratch; the admin account is upserted.
  // Students and their progress are cleared and not recreated.
  await db.itemResult.deleteMany();
  await db.progress.deleteMany();
  await db.student.deleteMany();
  await db.station.deleteMany(); // cascades to stages, levels and questions
  await db.surah.deleteMany();
  await seedAdmin();
  await seedCurriculum();
  await seedSample();

  // Reseeding creates new ids, so drop Next's cached content lists (unstable_cache persists on disk).
  rmSync(join(__dirname, "..", ".next", "cache", "fetch-cache"), { recursive: true, force: true });
  console.log("✔ cleared Next data cache — restart `npm run dev` if it is running");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
