import { Inject, Injectable } from '@nestjs/common';
import { UserRepository, USER_REPOSITORY } from '../ports/user.repository';
import { User } from '../../domain/entities/user';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(): Promise<User[]> {
    return this.userRepo.findAll();
  }
}
