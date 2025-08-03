import { Inject, Injectable } from '@nestjs/common';
import { IEmailService } from '../../domain/ports/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SendWelcomeEmailUseCase {
  constructor(
    @Inject('IEmailService')
    private readonly emailService: IEmailService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    userEmail: string,
    userName: string,
    token: string,
  ) {
    const apiUrl    = this.config.get<string>('API_URL');
    const verifyUrl = `${apiUrl}/users/verify-email?token=${token}`;
    const logoUrl = `${apiUrl}/static/assets/logo.png`;

    await this.emailService.sendMail(
      userEmail,
      'Confirma tu correo en Recomiéndame',
      'welcome',    // welcome.hbs
      { name: userName, logoUrl, verifyUrl },
    );
  }
}
