export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface AuthRepository {
  validateCredentials(email: string, password: string): Promise<string | null>;
}
