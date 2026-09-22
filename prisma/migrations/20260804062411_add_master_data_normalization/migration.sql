-- AlterTable
ALTER TABLE "partner_preferences" ADD COLUMN     "casteId" TEXT,
ADD COLUMN     "motherTongueId" TEXT,
ADD COLUMN     "religionId" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "casteId" TEXT,
ADD COLUMN     "gotraId" TEXT,
ADD COLUMN     "motherTongueId" TEXT,
ADD COLUMN     "religionId" TEXT;

-- CreateTable
CREATE TABLE "religions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "religions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "castes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "religionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "castes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gotras" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gotras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mother_tongues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mother_tongues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "religions_name_key" ON "religions"("name");

-- CreateIndex
CREATE INDEX "castes_religionId_idx" ON "castes"("religionId");

-- CreateIndex
CREATE UNIQUE INDEX "castes_name_religionId_key" ON "castes"("name", "religionId");

-- CreateIndex
CREATE UNIQUE INDEX "gotras_name_key" ON "gotras"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mother_tongues_name_key" ON "mother_tongues"("name");

-- CreateIndex
CREATE INDEX "partner_preferences_religionId_idx" ON "partner_preferences"("religionId");

-- CreateIndex
CREATE INDEX "partner_preferences_casteId_idx" ON "partner_preferences"("casteId");

-- CreateIndex
CREATE INDEX "partner_preferences_motherTongueId_idx" ON "partner_preferences"("motherTongueId");

-- CreateIndex
CREATE INDEX "profiles_religionId_idx" ON "profiles"("religionId");

-- CreateIndex
CREATE INDEX "profiles_casteId_idx" ON "profiles"("casteId");

-- CreateIndex
CREATE INDEX "profiles_gotraId_idx" ON "profiles"("gotraId");

-- CreateIndex
CREATE INDEX "profiles_motherTongueId_idx" ON "profiles"("motherTongueId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_motherTongueId_fkey" FOREIGN KEY ("motherTongueId") REFERENCES "mother_tongues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "religions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_casteId_fkey" FOREIGN KEY ("casteId") REFERENCES "castes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_gotraId_fkey" FOREIGN KEY ("gotraId") REFERENCES "gotras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_preferences" ADD CONSTRAINT "partner_preferences_motherTongueId_fkey" FOREIGN KEY ("motherTongueId") REFERENCES "mother_tongues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_preferences" ADD CONSTRAINT "partner_preferences_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "religions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_preferences" ADD CONSTRAINT "partner_preferences_casteId_fkey" FOREIGN KEY ("casteId") REFERENCES "castes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "castes" ADD CONSTRAINT "castes_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "religions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
