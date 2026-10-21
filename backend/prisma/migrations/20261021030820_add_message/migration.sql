-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('stored', 'delivered', 'read');

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "lastSeq" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "wrappedSessionKeyFrom" TEXT NOT NULL,
    "wrappedSessionKeyTo" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "hmac" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MessageStatus" NOT NULL DEFAULT 'stored',

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_toId_status_idx" ON "Message"("toId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Message_chatId_seq_key" ON "Message"("chatId", "seq");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
