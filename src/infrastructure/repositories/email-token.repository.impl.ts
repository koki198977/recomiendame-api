// infrastructure/repositories/email-token.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailVerificationTokenRepository } from '../../application/ports/email-token.repository';
import { EmailVerificationToken } from '../../domain/entities/email-verification-token';

@Injectable()
export class EmailVerificationTokenRepositoryImpl implements EmailVerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async findByToken(token: string): Promise<EmailVerificationToken | null> {
    const result = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    if (!result) return null;
    return new EmailVerificationToken(result.id, result.userId, result.token, result.expiresAt);
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.emailVerificationToken.delete({ where: { id } });
  }
}
