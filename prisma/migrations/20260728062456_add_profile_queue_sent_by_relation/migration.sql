-- AddForeignKey
ALTER TABLE "profile_queue" ADD CONSTRAINT "profile_queue_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
