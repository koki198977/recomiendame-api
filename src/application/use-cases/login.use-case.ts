import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_REPOSITORY, AuthRepository } from '../ports/auth.repository';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(email: string, password: string): Promise<{ accessToken: string }> {
    const userId = await this.authRepository.validateCredentials(email, password);
    if (!userId) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }
}
