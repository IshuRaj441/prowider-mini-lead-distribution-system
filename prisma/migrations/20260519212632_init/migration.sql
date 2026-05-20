-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_phoneNumber_idx" ON "Lead"("phoneNumber");

-- CreateIndex
CREATE INDEX "Lead_serviceId_createdAt_idx" ON "Lead"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_assignedAt_idx" ON "LeadAssignment"("assignedAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_leadId_providerId_idx" ON "LeadAssignment"("leadId", "providerId");

-- CreateIndex
CREATE INDEX "Provider_id_remainingQuota_idx" ON "Provider"("id", "remainingQuota");
