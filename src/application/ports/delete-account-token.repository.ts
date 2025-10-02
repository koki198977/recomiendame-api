import { DeleteAccountToken } from 'src/domain/entities/delete-account-token';

export const DELETE_ACCOUNT_TOKEN_REPOSITORY = 'DeleteAccountTokenRepository';

export interface DeleteAccountTokenRepository {
  create(userId: string, token: string, expiresAt: Date): Promise<void>;
  findByToken(token: string): Promise<DeleteAccountToken | null>;
  deleteById(id: string): Promise<void>;
}
