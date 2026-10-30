-- CreateEnum
CREATE TYPE "AgeTrack" AS ENUM ('CHILD', 'YOUTH');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('ALL', 'CHILD', 'YOUTH');

-- CreateEnum
CREATE TYPE "KnowledgeKind" AS ENUM ('MEANING', 'STORY', 'VALUE', 'THEME', 'FACT');

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "Level" DROP CONSTRAINT "Level_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_gradeId_fkey";

-- DropIndex
DROP INDEX "Level_categoryId_status_order_idx";

-- DropIndex
DROP INDEX "Student_gradeId_lastActiveAt_idx";

-- AlterTable
ALTER TABLE "Level" DROP COLUMN "categoryId",
ADD COLUMN     "audience" "Audience" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "stageId" TEXT NOT NULL,
ADD COLUMN     "surahNumber" INTEGER;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "gradeId",
ADD COLUMN     "track" "AgeTrack" NOT NULL;

-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "ayah" INTEGER,
ADD COLUMN     "kind" "KnowledgeKind" NOT NULL DEFAULT 'MEANING',
ADD COLUMN     "quranText" TEXT,
ADD COLUMN     "surahNumber" INTEGER;

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Grade";

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📖',
    "color" TEXT NOT NULL DEFAULT '#1F6FC5',
    "status" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "valueCluster" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surah" (
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ayahCount" INTEGER NOT NULL,

    CONSTRAINT "Surah_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "StageSurah" (
    "stageId" TEXT NOT NULL,
    "surahNumber" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "fromAyah" INTEGER,
    "toAyah" INTEGER,

    CONSTRAINT "StageSurah_pkey" PRIMARY KEY ("stageId","surahNumber")
);

-- CreateTable
CREATE TABLE "ItemResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "mistakes" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Station_order_key" ON "Station"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_number_key" ON "Stage"("number");

-- CreateIndex
CREATE INDEX "Stage_stationId_number_idx" ON "Stage"("stationId", "number");

-- CreateIndex
CREATE INDEX "StageSurah_surahNumber_idx" ON "StageSurah"("surahNumber");

-- CreateIndex
CREATE INDEX "ItemResult_studentId_wordId_createdAt_idx" ON "ItemResult"("studentId", "wordId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemResult_wordId_idx" ON "ItemResult"("wordId");

-- CreateIndex
CREATE INDEX "ItemResult_levelId_idx" ON "ItemResult"("levelId");

-- CreateIndex
CREATE INDEX "Level_stageId_status_order_idx" ON "Level"("stageId", "status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Level_stageId_order_key" ON "Level"("stageId", "order");

-- CreateIndex
CREATE INDEX "Student_track_lastActiveAt_idx" ON "Student"("track", "lastActiveAt");

-- CreateIndex
CREATE INDEX "Word_surahNumber_idx" ON "Word"("surahNumber");

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageSurah" ADD CONSTRAINT "StageSurah_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageSurah" ADD CONSTRAINT "StageSurah_surahNumber_fkey" FOREIGN KEY ("surahNumber") REFERENCES "Surah"("number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_surahNumber_fkey" FOREIGN KEY ("surahNumber") REFERENCES "Surah"("number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_surahNumber_fkey" FOREIGN KEY ("surahNumber") REFERENCES "Surah"("number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemResult" ADD CONSTRAINT "ItemResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemResult" ADD CONSTRAINT "ItemResult_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemResult" ADD CONSTRAINT "ItemResult_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

