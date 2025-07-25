import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordResetTokenRepository } from '../../application/ports/password-reset-token.repository';
import { PasswordResetToken } from 'src/domain/entities/password-reset-token';

@Injectable()
export class PasswordResetTokenRepositoryImpl implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) return null;

    return new PasswordResetToken(
      record.id,
      record.userId,
      record.token,
      record.expiresAt,
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.passwordResetToken.delete({
      where: { id },
    });
  }
}
