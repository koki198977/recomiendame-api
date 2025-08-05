import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { addMinutes } from 'date-fns';
import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';
import { PASSWORD_RESET_TOKEN_REPOSITORY, PasswordResetTokenRepository } from '../ports/password-reset-token.repository';
import { IEmailService } from 'src/domain/ports/email.service';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject('IEmailService')
    private readonly emailService: IEmailService,
    
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,

    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly tokenRepo: PasswordResetTokenRepository,

    private readonly config: ConfigService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const token = randomUUID();
    const expiresAt = addMinutes(new Date(), 30); // válido por 30 minutos

    await this.tokenRepo.create(user.id, token, expiresAt);

    // toma la URL del front desde env (fallback al localhost)
    const apiUrl    = this.config.get<string>('API_URL');
    const frontUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:8080');
    const resetUrl = `${frontUrl}/reset-password?token=${token}`;
    const logoUrl = `${apiUrl}/static/assets/logo.png`;

    // usa plantilla Handlebars
     await this.emailService.sendMail(
      user.email,
      'Recuperación de contraseña',
      'reset-password',
      { fullName: user.fullName, logoUrl, resetUrl, expiresInMinutes: 30, },
    );
  }
}
