-- CreateTable
CREATE TABLE "PatientAccount" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccount_patientId_key" ON "PatientAccount"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccount_email_key" ON "PatientAccount"("email");

-- AddForeignKey
ALTER TABLE "PatientAccount" ADD CONSTRAINT "PatientAccount_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
