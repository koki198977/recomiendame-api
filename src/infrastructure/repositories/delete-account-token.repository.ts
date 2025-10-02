import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeleteAccountTokenRepository } from 'src/application/ports/delete-account-token.repository';
import { DeleteAccountToken } from 'src/domain/entities/delete-account-token';

@Injectable()
export class DeleteAccountTokenRepositoryImpl implements DeleteAccountTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.deleteAccountToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async findByToken(token: string): Promise<DeleteAccountToken | null> {
    const record = await this.prisma.deleteAccountToken.findUnique({ where: { token } });
    if (!record) return null;
    return new DeleteAccountToken(record.id, record.userId, record.token, record.expiresAt);
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.deleteAccountToken.delete({ where: { id } });
  }
}
