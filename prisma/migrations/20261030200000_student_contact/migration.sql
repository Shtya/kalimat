-- AlterTable
ALTER TABLE "Student" ADD COLUMN "phone" TEXT;
ALTER TABLE "Student" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_phone_key" ON "Student"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
