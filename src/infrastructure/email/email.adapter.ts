import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { IEmailService } from '../../domain/ports/email.service';

@Injectable()
export class EmailAdapter implements IEmailService {
  constructor(private readonly mailer: MailerService) {}

  async sendMail(
    to: string,
    subject: string,
    template: string,
    context: any = {},
  ): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject,
      template,
      context,
    });
  }
}
