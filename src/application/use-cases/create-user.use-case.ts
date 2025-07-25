import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';
import { EMAIL_TOKEN_REPOSITORY, EmailVerificationTokenRepository } from '../ports/email-token.repository';
import { User } from '../../domain/entities/user';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(EMAIL_TOKEN_REPOSITORY)
    private readonly tokenRepo: EmailVerificationTokenRepository,
  ) {}

  async execute(input: {
    email: string;
    password: string;
    fullName: string;
    birthDate?: string;
    gender?: string;
    country?: string;
    language?: string;
    favoriteGenres?: string[];
  }): Promise<User> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) throw new Error('Email already in use');

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await this.userRepo.create({
      email: input.email,
      password: hashedPassword,
      fullName: input.fullName,
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      gender: input.gender,
      country: input.country,
      language: input.language,
      favoriteGenres: input.favoriteGenres,
      emailVerified: false,
      createdAt: new Date(),
    });

    const token = uuid();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await this.tokenRepo.create(user.id, token, expiresAt);

    console.log(`🔗 Verificación: https://tudominio.com/verify-email?token=${token}`);

    return user;
  }
}
