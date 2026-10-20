/*
  Warnings:

  - You are about to drop the column `authHash` on the `User` table. All the data in the column will be lost.
  - Added the required column `authKey` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "authHash",
ADD COLUMN     "authKey" TEXT NOT NULL;
