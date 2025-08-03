// src/infrastructure/email/email.module.ts

import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

import { EmailAdapter } from './email.adapter';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
    // Aquí ya puedes loguear tus vars de entorno:
    console.log('SMTP user:', config.get('MAIL_USER'));
    console.log('SMTP pass length:', config.get<string>('MAIL_PASS')?.length);

    // Y luego devuelves la configuración válida:
    return {
      transport: {
        service: 'gmail',
        auth: {
          user: config.get<string>('MAIL_USER'),
          pass: config.get<string>('MAIL_PASS'),
        },
      },
      defaults: {
        from: config.get<string>('MAIL_FROM'),
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(),
        options: { strict: true },
      },
      logger: true,
      debug: true,
      timeout: 10000,
    };
  },
    }),
  ],
  providers: [
    {
      provide: 'IEmailService',
      useClass: EmailAdapter,
    },
  ],
  exports: ['IEmailService'],
})
export class EmailModule {}
