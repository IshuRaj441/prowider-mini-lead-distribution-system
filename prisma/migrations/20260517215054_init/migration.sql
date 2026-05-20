-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyQuota" INTEGER NOT NULL DEFAULT 10,
    "remainingQuota" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationState" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" SERIAL NOT NULL,
    "eventId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Provider_remainingQuota_idx" ON "Provider"("remainingQuota");

-- CreateIndex
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");

-- CreateIndex
CREATE INDEX "Lead_serviceId_idx" ON "Lead"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phoneNumber_serviceId_key" ON "Lead"("phoneNumber", "serviceId");

-- CreateIndex
CREATE INDEX "LeadAssignment_leadId_idx" ON "LeadAssignment"("leadId");

-- CreateIndex
CREATE INDEX "LeadAssignment_providerId_idx" ON "LeadAssignment"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadAssignment_leadId_providerId_key" ON "LeadAssignment"("leadId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationState_serviceId_key" ON "AllocationState"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventId_idx" ON "WebhookEvent"("eventId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationState" ADD CONSTRAINT "AllocationState_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
