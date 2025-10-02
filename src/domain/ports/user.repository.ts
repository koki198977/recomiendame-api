export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface UserEntity {
  id: string;
  email: string;
  password: string;
}

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  deleteUserAndCleanup(userId: string): Promise<void>;
}
