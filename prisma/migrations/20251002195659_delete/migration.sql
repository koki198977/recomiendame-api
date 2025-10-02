-- DropForeignKey
ALTER TABLE "DeleteAccountToken" DROP CONSTRAINT "DeleteAccountToken_userId_fkey";

-- AddForeignKey
ALTER TABLE "DeleteAccountToken" ADD CONSTRAINT "DeleteAccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
