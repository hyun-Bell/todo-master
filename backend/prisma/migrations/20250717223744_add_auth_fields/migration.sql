-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT,
ADD COLUMN     "refresh_token" TEXT,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
