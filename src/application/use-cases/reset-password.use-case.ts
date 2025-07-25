import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '../ports/password-reset-token.repository';
import { USER_REPOSITORY } from '../ports/user.repository';
import { PasswordResetTokenRepository } from '../ports/password-reset-token.repository';
import { UserRepository } from '../ports/user.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const tokenData = await this.passwordResetTokenRepository.findByToken(token);

    if (!tokenData || tokenData.isExpired()) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (newPassword.length < 8) {
        throw new UnauthorizedException('La contraseña debe tener al menos 8 caracteres');
    }

    const user = await this.userRepository.findById(tokenData.userId);
    if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
    }
    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
    throw new UnauthorizedException('La nueva contraseña no puede ser igual a la anterior');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(tokenData.userId, hashedPassword);
    await this.passwordResetTokenRepository.deleteById(tokenData.id);
  }
}
