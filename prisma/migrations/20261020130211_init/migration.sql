/*
  Warnings:

  - You are about to drop the column `discordMessageId` on the `TransferItem` table. All the data in the column will be lost.
  - You are about to drop the column `receiptUrl` on the `TransferItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TransferItem" DROP COLUMN "discordMessageId",
DROP COLUMN "receiptUrl";
