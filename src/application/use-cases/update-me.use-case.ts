import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';

@Injectable()
export class UpdateMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, updateData: Partial<{
    fullName: string;
    birthDate: Date;
    gender: string;
    country: string;
    language: string;
    favoriteGenres: string[];
  }>) {
    return this.userRepository.update(userId, updateData);
  }
}
