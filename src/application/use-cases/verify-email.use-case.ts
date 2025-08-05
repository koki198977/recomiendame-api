import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import {
  EMAIL_TOKEN_REPOSITORY,
  EmailVerificationTokenRepository,
} from '../ports/email-token.repository';
import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';

export type VerifyStatus = 'success' | 'expired' | 'invalid';
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(EMAIL_TOKEN_REPOSITORY)
    private readonly tokenRepo: EmailVerificationTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(token: string): Promise<VerifyStatus> {
    const tokenData = await this.tokenRepo.findByToken(token);
    if (!tokenData) {
      return 'invalid';
    }

    if (tokenData.expiresAt < new Date()) {
      await this.tokenRepo.deleteById(tokenData.id);
      return 'expired';
    }

    await this.userRepo.verifyEmail(tokenData.userId);
    await this.tokenRepo.deleteById(tokenData.id);

    return 'success';
  }
}
