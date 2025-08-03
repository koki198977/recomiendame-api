import { Inject, Injectable } from '@nestjs/common';
import { IEmailService } from '../../domain/ports/email.service';

@Injectable()
export class SendWelcomeEmailUseCase {
  constructor(
    @Inject('IEmailService')
    private readonly emailService: IEmailService,
  ) {}

  async execute(userEmail: string, userName: string) {
    await this.emailService.sendMail(
      userEmail,
      '¡Bienvenido a Recomiéndame!',
      'welcome',     // plantillas/welcome.hbs
      { name: userName },
    );
  }
}
