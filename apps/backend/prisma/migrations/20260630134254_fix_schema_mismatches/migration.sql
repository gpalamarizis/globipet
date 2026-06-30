-- AlterTable
ALTER TABLE "services" ADD COLUMN     "category" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'GR',
ADD COLUMN     "cover_image" TEXT,
ADD COLUMN     "title" TEXT;
