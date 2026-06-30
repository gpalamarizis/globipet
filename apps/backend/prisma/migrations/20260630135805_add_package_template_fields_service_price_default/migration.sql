-- AlterTable
ALTER TABLE "service_packages" ADD COLUMN     "breed_group" TEXT,
ADD COLUMN     "is_addon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modality" TEXT,
ADD COLUMN     "pet_type" TEXT,
ADD COLUMN     "size" TEXT;

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "price" SET DEFAULT 0;
