import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  DELETE_ACCOUNT_TOKEN_REPOSITORY,
  DeleteAccountTokenRepository,
} from 'src/application/ports/delete-account-token.repository';
import {
  USER_REPOSITORY,
  UserRepository,
} from 'src/application/ports/user.repository';

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(DELETE_ACCOUNT_TOKEN_REPOSITORY)
    private readonly deleteAccountTokenRepo: DeleteAccountTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(token: string): Promise<void> {
    const tokenData = await this.deleteAccountTokenRepo.findByToken(token);

    if (!tokenData || tokenData.isExpired()) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const user = await this.userRepo.findById(tokenData.userId);
    if (!user) {
      await this.deleteAccountTokenRepo.deleteById(tokenData.id);
      throw new UnauthorizedException('Usuario no encontrado');
    }

    await this.deleteAccountTokenRepo.deleteById(tokenData.id);
    await this.userRepo.deleteUserAndCleanup(tokenData.userId);

    
  }
}
