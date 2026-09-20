import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import {
  ConfirmPaymentIntentDto,
  CreatePaymentIntentDto,
} from '../dto/serenity.dto';
import { PaymentProviderId } from '../payments/gateway/payment-gateway.types';
import { PaymentsService } from '../services';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('intents')
  @ApiOkResponse()
  createIntent(@Request() request, @Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createIntent(request.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('intents/:id/confirm')
  @ApiOkResponse()
  confirmIntent(
    @Request() request,
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentIntentDto,
  ) {
    return this.paymentsService.confirmIntent(request.user.id, id, dto ?? {});
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('intents/:id')
  @ApiOkResponse()
  getIntent(@Request() request, @Param('id') id: string) {
    return this.paymentsService.getIntent(request.user.id, id);
  }

  @Post('webhooks/payment-status')
  @HttpCode(410)
  @ApiOkResponse({ description: 'Gone — use provider-specific webhook routes' })
  legacyWebhook() {
    return this.paymentsService.legacyMockWebhook();
  }

  @Post('webhooks/:provider')
  @ApiOkResponse()
  webhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const allowed: PaymentProviderId[] = ['razorpay', 'stripe', 'payu'];
    if (!allowed.includes(provider as PaymentProviderId)) {
      return this.paymentsService.legacyMockWebhook();
    }

    const rawBody = req.rawBody;
    const hasRaw =
      rawBody != null &&
      (Buffer.isBuffer(rawBody)
        ? rawBody.length > 0
        : String(rawBody).length > 0);

    if (provider !== 'payu' && !hasRaw) {
      throw new BadRequestException({
        message: 'Raw request body required for webhook signature verification',
        code: 'PAYMENT_WEBHOOK_RAW_BODY_REQUIRED',
      });
    }

    let payuRaw = Buffer.alloc(0);
    if (!hasRaw && provider === 'payu') {
      const body = req.body as unknown;
      if (typeof body === 'string') {
        payuRaw = Buffer.from(body);
      } else if (body && typeof body === 'object') {
        payuRaw = Buffer.from(
          new URLSearchParams(
            Object.entries(body as Record<string, unknown>).map(([k, v]) => [
              k,
              String(v ?? ''),
            ]),
          ).toString(),
        );
      }
    }

    return this.paymentsService.applyProviderWebhook(
      provider as PaymentProviderId,
      {
        rawBody: hasRaw ? (rawBody as Buffer) : payuRaw,
        headers,
        parsedBody: req.body,
        requireRawBody: provider !== 'payu',
      },
    );
  }
}
