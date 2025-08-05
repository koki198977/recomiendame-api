export interface MailPayload {
  to: string;
  subject: string;

  // para backward-compatibility:
  body?: string;

  // para plantillas:
  template?: string;            // nombre, sin extensión, e.g. 'reset-password'
  context?: Record<string, any>; // datos que pasas a la plantilla
}

export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MailService {
  send(payload: MailPayload): Promise<void>;
}
