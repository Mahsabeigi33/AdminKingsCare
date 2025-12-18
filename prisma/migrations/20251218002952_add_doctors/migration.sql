-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "specialty" TEXT,
    "shortBio" TEXT,
    "bio" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "yearsExperience" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoUrl" TEXT,
    "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_phone_key" ON "Doctor"("phone");
