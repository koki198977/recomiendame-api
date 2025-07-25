import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository, USER_REPOSITORY } from '../ports/user.repository';
import { User } from '../../domain/entities/user';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(id: string, data: Partial<User>): Promise<User> {
    const existing = await this.userRepo.findById(id);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    return this.userRepo.update(id, data);
  }
}
