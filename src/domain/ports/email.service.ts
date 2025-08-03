export interface IEmailService {
  sendMail(to: string, subject: string, template: string, context?: any): Promise<void>;
}
