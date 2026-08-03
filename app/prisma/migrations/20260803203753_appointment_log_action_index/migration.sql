-- CreateIndex
CREATE INDEX "AppointmentLog_clinicId_action_createdAt_idx" ON "AppointmentLog"("clinicId", "action", "createdAt");
