-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "image_productId_fkey";

-- AlterTable
ALTER TABLE "_PostToPostTag" ADD CONSTRAINT "_PostToPostTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_PostToPostTag_AB_unique";

-- AlterTable
ALTER TABLE "_ProductToProductTag" ADD CONSTRAINT "_ProductToProductTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ProductToProductTag_AB_unique";

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
