import { Injectable } from '@nestjs/common';
import { MailService, MailPayload } from '../../application/ports/mail.service';

@Injectable()
export class ConsoleMailService implements MailService {
  async send(payload: MailPayload): Promise<void> {
    console.log(`📬 Enviando email a ${payload.to}`);
    console.log(`📌 Asunto: ${payload.subject}`);
    console.log(`📝 Mensaje:\n${payload.body}`);
  }
}
