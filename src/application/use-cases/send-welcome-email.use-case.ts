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
    const frontUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:8080');
    const verifyUrl = `${frontUrl}/verify-email/?token=${token}`;
    const logoUrl = 'https://recomiendameapp.cl/_nuxt/logo.B0ICmSKa.png';

    await this.emailService.sendMail(
      userEmail,
      'Confirma tu correo en Recomiéndame',
      'welcome',
      { fullName: userName, logoUrl, verifyUrl },
    );
  }
}
