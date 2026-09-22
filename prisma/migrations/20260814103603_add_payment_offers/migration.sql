-- CreateEnum
CREATE TYPE "PaymentOfferStatus" AS ENUM ('DRAFT', 'ACTIVE', 'OPENED', 'CHECKOUT_STARTED', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "payment_offers" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentOfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "firstOpenedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "checkoutStartedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentGateway" TEXT,
    "paymentOrderId" TEXT,
    "paymentTransactionId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_offers_token_key" ON "payment_offers"("token");

-- CreateIndex
CREATE UNIQUE INDEX "payment_offers_paymentId_key" ON "payment_offers"("paymentId");

-- CreateIndex
CREATE INDEX "payment_offers_token_idx" ON "payment_offers"("token");

-- CreateIndex
CREATE INDEX "payment_offers_profileId_idx" ON "payment_offers"("profileId");

-- CreateIndex
CREATE INDEX "payment_offers_status_idx" ON "payment_offers"("status");

-- AddForeignKey
ALTER TABLE "payment_offers" ADD CONSTRAINT "payment_offers_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_offers" ADD CONSTRAINT "payment_offers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_offers" ADD CONSTRAINT "payment_offers_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_offers" ADD CONSTRAINT "payment_offers_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
