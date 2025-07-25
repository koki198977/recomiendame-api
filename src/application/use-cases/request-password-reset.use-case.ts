import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';
import { PASSWORD_RESET_TOKEN_REPOSITORY, PasswordResetTokenRepository } from '../ports/password-reset-token.repository';
import { randomUUID } from 'crypto';
import { addMinutes } from 'date-fns';
import { MAIL_SERVICE, MailService } from '../ports/mail.service';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,

    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly tokenRepo: PasswordResetTokenRepository,
    
    @Inject(MAIL_SERVICE)
    private readonly mailService: MailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const token = randomUUID();
    const expiresAt = addMinutes(new Date(), 30); // válido por 30 minutos

    await this.tokenRepo.create(user.id, token, expiresAt);

    const resetUrl = `https://recomiendame.app/reset-password?token=${token}`;

    await this.mailService.send({
      to: user.email,
      subject: 'Recuperación de contraseña',
      body: `Haz clic en el siguiente enlace para recuperar tu contraseña:\n\n${resetUrl}`,
    });
  }
}
