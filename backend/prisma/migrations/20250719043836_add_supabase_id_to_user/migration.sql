-- AlterTable
ALTER TABLE "users" ADD COLUMN "supabase_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_supabase_id_key" ON "users"("supabase_id");