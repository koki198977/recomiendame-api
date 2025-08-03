import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';

import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';
import {
  EMAIL_TOKEN_REPOSITORY,
  EmailVerificationTokenRepository,
} from '../ports/email-token.repository';
import { SendWelcomeEmailUseCase } from './send-welcome-email.use-case';
import { User } from '../../domain/entities/user';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(EMAIL_TOKEN_REPOSITORY)
    private readonly tokenRepo: EmailVerificationTokenRepository,
    private readonly config: ConfigService,
    private readonly sendWelcomeEmail: SendWelcomeEmailUseCase,
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
    favoriteMedia?: string;
  }): Promise<User> {
    // 1. Validar existencia
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new HttpException(
        { message: 'Correo ya se encuentra registrado' },
        HttpStatus.CONFLICT,
      );
    }

    // 2. Crear usuario
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
      favoriteMedia: input.favoriteMedia,
      emailVerified: false,
      createdAt: new Date(),
    });

    // 3. Generar y guardar token
    const token = uuid();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora
    await this.tokenRepo.create(user.id, token, expiresAt);

    // 4. Construir URL de verificación
    const apiUrl   = this.config.get<string>('API_URL');
    const verifyUrl = `${apiUrl}/users/verify-email?token=${token}`;
    console.log(`🔗 Verificación URL: ${verifyUrl}`);

    // 5. Enviar correo de bienvenida/confirmación
    await this.sendWelcomeEmail.execute(
      user.email,
      user.fullName,
      token,           // necesitas ajustar execute para recibir token
    );

    return user;
  }
}
