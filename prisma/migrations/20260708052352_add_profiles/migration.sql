-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'REASSIGNED', 'ON_HOLD', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "profileCode" TEXT NOT NULL,
    "source" TEXT,
    "sourceInfo" TEXT,
    "email" TEXT,
    "altEmail" TEXT,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "contactPerson" TEXT,
    "creatingFor" TEXT,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dob" TIMESTAMP(3),
    "maritalStatus" TEXT,
    "height" TEXT,
    "weightKg" DOUBLE PRECISION,
    "motherTongue" TEXT,
    "bodyType" TEXT,
    "complexion" TEXT,
    "bloodGroup" TEXT,
    "healthStatus" TEXT,
    "nativePlace" TEXT,
    "aboutYourself" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "citizenship" TEXT,
    "countryGrewUp" TEXT,
    "visaStatus" TEXT,
    "religion" TEXT,
    "caste" TEXT,
    "subCaste" TEXT,
    "gotra" TEXT,
    "timeOfBirth" TEXT,
    "placeOfBirth" TEXT,
    "manglik" TEXT,
    "highestQualification" TEXT,
    "educationField" TEXT,
    "institute" TEXT,
    "workLocation" TEXT,
    "workingWith" TEXT,
    "profession" TEXT,
    "businessName" TEXT,
    "designation" TEXT,
    "annualIncome" TEXT,
    "diet" TEXT,
    "drinking" TEXT,
    "smoking" TEXT,
    "fatherOccupation" TEXT,
    "motherOccupation" TEXT,
    "brothers" INTEGER DEFAULT 0,
    "brothersMarried" INTEGER DEFAULT 0,
    "sisters" INTEGER DEFAULT 0,
    "sistersMarried" INTEGER DEFAULT 0,
    "familyType" TEXT,
    "affluence" TEXT,
    "familyValues" TEXT,
    "familyBio" TEXT,
    "familyAnnualIncome" TEXT,
    "photoUrl" TEXT,
    "status" "ProfileStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "assignedToId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_preferences" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "minHeight" TEXT,
    "maxHeight" TEXT,
    "maritalStatus" TEXT,
    "motherTongue" TEXT,
    "religion" TEXT,
    "caste" TEXT,
    "manglikStatus" TEXT,
    "hasChildrenOk" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "qualification" TEXT,
    "workingWith" TEXT,
    "profession" TEXT,
    "annualIncome" TEXT,
    "diet" TEXT,
    "drinking" TEXT,
    "smoking" TEXT,
    "aboutDesiredPartner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_profileCode_key" ON "profiles"("profileCode");

-- CreateIndex
CREATE INDEX "profiles_status_idx" ON "profiles"("status");

-- CreateIndex
CREATE INDEX "profiles_assignedToId_idx" ON "profiles"("assignedToId");

-- CreateIndex
CREATE INDEX "profiles_phone_idx" ON "profiles"("phone");

-- CreateIndex
CREATE INDEX "profiles_profileCode_idx" ON "profiles"("profileCode");

-- CreateIndex
CREATE UNIQUE INDEX "partner_preferences_profileId_key" ON "partner_preferences"("profileId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_preferences" ADD CONSTRAINT "partner_preferences_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
