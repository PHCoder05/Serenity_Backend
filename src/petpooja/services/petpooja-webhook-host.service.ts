import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';

/** Ops guardrail: warn when PetPooja callback URL is ephemeral (WP-P7). */
@Injectable()
export class PetpoojaWebhookHostService implements OnModuleInit {
  private readonly logger = new Logger(PetpoojaWebhookHostService.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  onModuleInit() {
    const callbackUrl =
      this.configService.get('petpooja.callbackUrl', { infer: true }) ?? '';
    if (!callbackUrl) {
      this.logger.warn(
        'PETPOOJA_CALLBACK_URL is empty — kitchen status callbacks will not reach Serenity',
      );
      return;
    }
    if (!/^https:\/\//i.test(callbackUrl)) {
      this.logger.warn(
        `PETPOOJA_CALLBACK_URL should be https (got ${callbackUrl})`,
      );
    }
    if (/ngrok-free|ngrok\.io|loca\.lt|trycloudflare\.com/i.test(callbackUrl)) {
      this.logger.warn(
        `PETPOOJA_CALLBACK_URL looks ephemeral (${callbackUrl}). Use a durable host for cert/prod — docs/ops/durable-webhook-host.md`,
      );
    }
  }
}
