import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RequestPasswordResetUseCase } from 'src/application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from 'src/application/use-cases/reset-password.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const access_token = this.jwtService.sign(payload);
    return { access_token };
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: { email: string }) {
    await this.requestPasswordResetUseCase.execute(body.email);
    return { message: 'Si el email existe, se ha enviado un enlace para restablecer la contraseña' };
  }

    @Post('reset-password')
    async resetPassword(@Body() body: { token: string; newPassword: string }) {
        await this.resetPasswordUseCase.execute(body.token, body.newPassword);
        return { message: 'Contraseña actualizada correctamente' };
    }

}
