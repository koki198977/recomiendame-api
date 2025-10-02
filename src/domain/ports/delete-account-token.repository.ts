export const DELETE_ACCOUNT_TOKEN_REPOSITORY = 'DELETE_ACCOUNT_TOKEN_REPOSITORY';

export interface DeleteAccountTokenEntity {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isExpired(): boolean;
}

export interface DeleteAccountTokenRepository {
  findByToken(token: string): Promise<DeleteAccountTokenEntity | null>;
  deleteById(id: string): Promise<void>;
}
