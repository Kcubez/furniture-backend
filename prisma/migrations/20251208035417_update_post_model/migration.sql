/*
  Warnings:

  - The primary key for the `_PostToPostTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_ProductToProductTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_PostToPostTag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_ProductToProductTag` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_PostToPostTag" DROP CONSTRAINT "_PostToPostTag_AB_pkey";

-- AlterTable
ALTER TABLE "_ProductToProductTag" DROP CONSTRAINT "_ProductToProductTag_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_PostToPostTag_AB_unique" ON "_PostToPostTag"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToProductTag_AB_unique" ON "_ProductToProductTag"("A", "B");
