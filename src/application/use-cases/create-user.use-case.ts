import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';

import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';
import {
  EMAIL_TOKEN_REPOSITORY,
  EmailVerificationTokenRepository,
} from '../ports/email-token.repository';
import { TMDB_REPOSITORY, TmdbRepository } from '../ports/tmdb.repository';
import { FAVORITE_REPOSITORY, FavoriteRepository } from '../ports/favorite.repository';
import { SendWelcomeEmailUseCase } from './send-welcome-email.use-case';
import { User } from '../../domain/entities/user';
import { Tmdb } from '../../domain/entities/tmdb';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(EMAIL_TOKEN_REPOSITORY)
    private readonly tokenRepo: EmailVerificationTokenRepository,
    @Inject(TMDB_REPOSITORY)
    private readonly tmdbRepo: TmdbRepository,
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepository,
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
    picks?: Array<{ tmdbId: number; title: string; mediaType: 'movie' | 'tv' }>;
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

    // 5. Enviar correo de bienvenida/confirmación
    await this.sendWelcomeEmail.execute(
      user.email,
      user.fullName,
      token,
    );

    // 6. Persistir picks como favoritos (secuencial, errores no interrumpen el registro)
    for (const pick of (input.picks ?? [])) {
      try {
        const tmdb = new Tmdb(
          pick.tmdbId,
          pick.title,
          new Date(),
          undefined,
          undefined,
          undefined,
          [],
          undefined,
          undefined,
          pick.mediaType,
          [],
          undefined,
        );
        await this.tmdbRepo.save(tmdb);
        await this.favoriteRepo.addFavorite(user.id, pick.tmdbId);
      } catch (err) {
        // log and continue — picks errors must not interrupt registration
        this.logger.warn(`Pick ${pick.tmdbId} skipped: ${err?.message}`);
      }
    }

    return user;
  }
}
