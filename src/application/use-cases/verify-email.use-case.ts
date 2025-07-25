import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import {
  EMAIL_TOKEN_REPOSITORY,
  EmailVerificationTokenRepository,
} from '../ports/email-token.repository';
import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(EMAIL_TOKEN_REPOSITORY)
    private readonly tokenRepo: EmailVerificationTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(token: string): Promise<void> {
    const tokenData = await this.tokenRepo.findByToken(token);
    if (!tokenData) throw new NotFoundException('Token inválido');

    if (tokenData.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    await this.userRepo.verifyEmail(tokenData.userId);
    await this.tokenRepo.deleteById(tokenData.id);
  }
}
