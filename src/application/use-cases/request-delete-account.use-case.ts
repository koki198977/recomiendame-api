import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { addMinutes } from 'date-fns';
import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';
import { DELETE_ACCOUNT_TOKEN_REPOSITORY, DeleteAccountTokenRepository } from '../ports/delete-account-token.repository';
import { IEmailService } from 'src/domain/ports/email.service';

@Injectable()
export class RequestDeleteAccountUseCase {
  constructor(
    @Inject('IEmailService')
    private readonly emailService: IEmailService,

    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,

    @Inject(DELETE_ACCOUNT_TOKEN_REPOSITORY)
    private readonly tokenRepo: DeleteAccountTokenRepository,

    private readonly config: ConfigService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const token = randomUUID();
    const expiresAt = addMinutes(new Date(), 30);

    await this.tokenRepo.create(user.id, token, expiresAt);

    const apiUrl   = this.config.get<string>('API_URL');
    const frontUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:8080');
    const deleteUrl = `${frontUrl}/delete-account/?token=${token}`;
    const logoUrl = `${apiUrl}/static/assets/logo.png`;

    await this.emailService.sendMail(
      user.email,
      'Eliminación de cuenta',
      'delete-account',
      { fullName: user.fullName, logoUrl, deleteUrl, expiresInMinutes: 30 },
    );
  }
}
