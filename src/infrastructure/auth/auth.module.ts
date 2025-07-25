import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestPasswordResetUseCase } from 'src/application/use-cases/request-password-reset.use-case';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from 'src/application/ports/password-reset-token.repository';
import { PasswordResetTokenRepositoryImpl } from '../repositories/password-reset-token.repository.impl';
import { MAIL_SERVICE } from 'src/application/ports/mail.service';
import { ConsoleMailService } from '../services/mail.service.impl';
import { USER_REPOSITORY } from 'src/application/ports/user.repository';
import { UserRepositoryImpl } from '../repositories/user.repository.impl';
import { ResetPasswordUseCase } from 'src/application/use-cases/reset-password.use-case';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useClass: PasswordResetTokenRepositoryImpl },
    { provide: MAIL_SERVICE, useClass: ConsoleMailService },
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
