-- CreateTable
CREATE TABLE "PatientServiceUsage" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientServiceUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientServiceUsage_patientId_serviceId_key" ON "PatientServiceUsage"("patientId", "serviceId");

-- AddForeignKey
ALTER TABLE "PatientServiceUsage" ADD CONSTRAINT "PatientServiceUsage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientServiceUsage" ADD CONSTRAINT "PatientServiceUsage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
