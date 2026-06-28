import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreatePaymentIntentDto, PaymentWebhookDto } from '../dto/serenity.dto';
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
  @Get('intents/:id')
  @ApiOkResponse()
  getIntent(@Request() request, @Param('id') id: string) {
    return this.paymentsService.getIntent(request.user.id, id);
  }

  @Post('webhooks/payment-status')
  @ApiOkResponse()
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentsService.applyWebhook(dto);
  }
}
