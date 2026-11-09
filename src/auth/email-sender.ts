import { Injectable, Logger } from '@nestjs/common';

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailSender {
  sendOtp(email: string, code: string): Promise<void>;
}

@Injectable()
export class ConsoleEmailSender implements EmailSender {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  async sendOtp(email: string, code: string): Promise<void> {
    this.logger.log(`OTP for ${email}: ${code}`);
  }
}
