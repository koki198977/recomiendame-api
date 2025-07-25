import { PasswordResetToken } from "src/domain/entities/password-reset-token";

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PASSWORD_RESET_TOKEN_REPOSITORY');

export interface PasswordResetTokenRepository {
  create(userId: string, token: string, expiresAt: Date): Promise<void>;
  findByToken(token: string): Promise<PasswordResetToken | null>;
  deleteById(id: string): Promise<void>;
}
