import { EmailVerificationToken } from '../../domain/entities/email-verification-token';
export const EMAIL_TOKEN_REPOSITORY = Symbol('EMAIL_TOKEN_REPOSITORY');


export interface EmailVerificationTokenRepository {
  create(userId: string, token: string, expiresAt: Date): Promise<void>;
  findByToken(token: string): Promise<EmailVerificationToken | null>;
  deleteById(id: string): Promise<void>;
}
