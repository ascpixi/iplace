/*
  Warnings:

  - Added the required column `airtableId` to the `Frame` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Frame" ADD COLUMN     "airtableId" TEXT NOT NULL;
