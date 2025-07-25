import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './infrastructure/auth/auth.module';
import { SeenController } from './infrastructure/http/seen.controller';
import { MarkSeenUseCase } from './application/use-cases/mark-seen.use-case';
import { SeenRepositoryToken } from './application/ports/seen.repository';
import { GetSeenItemsUseCase } from './application/use-cases/get-seen-items.use-case';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { PgSeenRepository } from './infrastructure/repositories/seen.repository.impl';
import { UserController } from './infrastructure/http/user.controller';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { USER_REPOSITORY } from './application/ports/user.repository';
import { UserRepositoryImpl } from './infrastructure/repositories/user.repository.impl';
import { EMAIL_TOKEN_REPOSITORY } from './application/ports/email-token.repository';
import { EmailVerificationTokenRepositoryImpl } from './infrastructure/repositories/email-token.repository.impl';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { AUTH_REPOSITORY } from './application/ports/auth.repository';
import { AuthRepositoryImpl } from './infrastructure/repositories/auth.repository.impl';
import { JwtModule } from '@nestjs/jwt';
import { FAVORITE_REPOSITORY } from './application/ports/favorite.repository';
import { FavoriteRepositoryImpl } from './infrastructure/repositories/favorite.repository.impl';
import { FavoriteController } from './infrastructure/http/favorite.controller';
import { AddFavoriteUseCase } from './application/use-cases/add-favorite.use-case';
import { RemoveFavoriteUseCase } from './application/use-cases/remove-favorite.use-case';
import { GetFavoritesUseCase } from './application/use-cases/get-favorites.use-case';
import { TmdbModule } from './infrastructure/tmdb/tmdb.module';
import { RatingController } from './infrastructure/http/rating.controller';
import { RateItemUseCase } from './application/use-cases/rate-item.use-case';
import { GetUserRatingsUseCase } from './application/use-cases/get-user-ratings.use-case';
import { RATING_REPOSITORY } from './application/ports/rating.repository';
import { RatingRepositoryImpl } from './infrastructure/repositories/rating.repository.impl';
import { OpenAiService } from './infrastructure/ai/openai.service';
import { GenerateRecommendationsUseCase } from './application/use-cases/generate-recommendations.use-case';
import { RecommendationController } from './infrastructure/http/recommendation.controller';
import { USER_DATA_REPOSITORY } from './application/ports/user-data.repository';
import { UserDataRepositoryImpl } from './infrastructure/repositories/user-data.repository.impl';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '7d' } }),
    TmdbModule
  ],
  controllers: [AppController, SeenController, UserController, FavoriteController, RatingController, RecommendationController],
  providers: [
    OpenAiService,
    GenerateRecommendationsUseCase,
    {
      provide: USER_DATA_REPOSITORY,
      useClass: UserDataRepositoryImpl,
    },
    AppService,
    CreateUserUseCase,
    VerifyEmailUseCase,
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
    { provide: EMAIL_TOKEN_REPOSITORY, useClass: EmailVerificationTokenRepositoryImpl },
    LoginUseCase,
    { provide: AUTH_REPOSITORY, useClass: AuthRepositoryImpl },
    GetUserByIdUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    MarkSeenUseCase,
    GetSeenItemsUseCase,
    {
      provide: SeenRepositoryToken,
      useClass: PgSeenRepository,
    },
    AddFavoriteUseCase,
    RemoveFavoriteUseCase,
    GetFavoritesUseCase,
    {
      provide: FAVORITE_REPOSITORY,
      useClass: FavoriteRepositoryImpl,
    },
    RateItemUseCase,
    GetUserRatingsUseCase,
    {
      provide: RATING_REPOSITORY,
      useClass: RatingRepositoryImpl,
    },
  ]
})
export class AppModule {}
