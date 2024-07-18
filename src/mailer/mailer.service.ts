/*
  Free and Open Source - GNU LGPLv3
  Copyright © 2024
  Afonso Barracha
*/

import { Injectable, Logger, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { createTransport, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { join } from 'path';
import { IEmailConfig } from '../config/interfaces/email-config.interface';
import { IUser } from '../users/interfaces/user.interface';

enum EmailParts {
  ResetPassword = 'reset-password',
  Confirmation = 'confirmation',
  Welcome = 'welcome',
}

const SubjectByTypeMap: Record<EmailParts, string> = {
  [EmailParts.ResetPassword]: 'Password Reset',
  [EmailParts.Confirmation]: 'Confirm your email',
  [EmailParts.Welcome]: 'Welcome to Shortly',
};

@Injectable()
export class MailerService {
  private readonly loggerService: LoggerService;

  private readonly transport: Transporter<SMTPTransport.SentMessageInfo>;
  private readonly email: string;

  private readonly domain: string;

  private emailLayout: TemplateDelegate;

  private handleBars: typeof Handlebars;

  constructor(private readonly configService: ConfigService) {
    const emailConfig = this.configService.get<IEmailConfig>('emailService');

    this.transport = createTransport(emailConfig);

    this.email = `"Shortly" <${emailConfig.auth.user}>`;

    this.domain = this.configService.get<string>('domain');

    this.loggerService = new Logger(MailerService.name);

    this.handleBars = Handlebars.create();

    this.setPart(EmailParts.Confirmation);
    this.emailLayout = this.registerLayout();
  }

  private setPart(
    partName: EmailParts,
  ): void {
    const template = readFileSync(
      join(__dirname, 'templates', `${partName}.hbs`),
      'utf-8',
    );

    this.handleBars.registerPartial('content', template);
  }

  private registerLayout(): Handlebars.TemplateDelegate<{ year: number }> {
    const template = readFileSync(
      join(__dirname, 'templates', `layout.hbs`),
      'utf-8',
    );

    return this.handleBars.compile<{ year: number }>(template, { strict: true });
  }

  public sendConfirmationEmail(user: IUser, token: string): void {
    const { email, firstName, lastName } = user;

    this.sendEmail(
      email,
      EmailParts.Confirmation,
      {
        name: `${firstName} ${lastName}`,
        link: `https://${this.domain}/auth/confirm/${token}`,
      },
      `A new ${EmailParts.Confirmation} email was sent.`,
    );
  }

  public sendWelcomeEmail(user: IUser): void {
    const { email, firstName, lastName } = user;

    this.sendEmail(
      email,
      EmailParts.Welcome,
      {
        name: `${firstName} ${lastName}`,
      },
      `A new ${EmailParts.Welcome} email was sent.`,
    );
  }

  public sendResetPasswordEmail(user: IUser, token: string): void {
    const { email, firstName, lastName } = user;

    this.sendEmail(
      email,
      EmailParts.ResetPassword,
      {
        name: `${firstName} ${lastName}`,
        link: `https://${this.domain}/auth/reset-password?token=${token}`,
      },
      `A new ${EmailParts.ResetPassword} email was sent.`,
    );
  }

  public sendEmail<T>(
    to: string,
    emailPart: EmailParts,
    data: T,
    log?: string,
  ): void {
    this.setPart(emailPart);
    this.emailLayout = this.registerLayout();

    const html = this.emailLayout({ ...data, year: new Date().getFullYear() });

    this.transport
      .sendMail({
        from: this.email,
        to,
        subject: SubjectByTypeMap[emailPart],
        html,
      })
      .then(() => this.loggerService.log(log ?? 'A new email was sent.'))
      .catch((error) => this.loggerService.error(error));
  }
}
