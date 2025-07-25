export interface MailPayload {
  to: string;
  subject: string;
  body: string;
}

export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MailService {
  send(payload: MailPayload): Promise<void>;
}
