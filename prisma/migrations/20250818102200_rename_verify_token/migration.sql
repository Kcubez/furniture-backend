/*
  Warnings:

  - You are about to drop the column `verifyTokens` on the `otp` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."otp" RENAME COLUMN "verifyTokens" TO "verifyToken";
