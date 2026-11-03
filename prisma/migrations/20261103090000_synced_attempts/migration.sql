-- CreateTable
CREATE TABLE "SyncedAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncedAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncedAttempt_studentId_idx" ON "SyncedAttempt"("studentId");

-- AddForeignKey
ALTER TABLE "SyncedAttempt" ADD CONSTRAINT "SyncedAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

