import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import {
  ActivatePaymentGatewayDto,
  TestPaymentGatewayDto,
  UpsertPaymentGatewayDto,
} from '../dto/serenity.dto';
import { PaymentGatewayConfigService } from '../payments/gateway/payment-gateway-config.service';
import { PaymentProviderId } from '../payments/gateway/payment-gateway.types';
import { PaymentOutboxService } from '../payments/outbox/payment-outbox.service';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Admin Payments')
@Controller({ path: 'admin/payments', version: '1' })
export class AdminPaymentsController {
  constructor(
    private readonly gatewayConfig: PaymentGatewayConfigService,
    private readonly paymentOutbox: PaymentOutboxService,
  ) {}

  @Get('gateways')
  @ApiOkResponse()
  listGateways() {
    return this.gatewayConfig.listGatewaysDetailed();
  }

  @Get('gateway')
  @ApiOkResponse()
  getGateway(@Query('provider') provider: string) {
    return this.gatewayConfig.getMasked(provider as PaymentProviderId);
  }

  @Put('gateway')
  @ApiOkResponse()
  upsertGateway(@Request() request, @Body() dto: UpsertPaymentGatewayDto) {
    return this.gatewayConfig.upsert({
      provider: dto.provider,
      mode: dto.mode,
      credentials: dto.credentials,
      webhookSecret: dto.webhookSecret,
      activate: dto.activate,
      updatedByUserId: request.user.id,
    });
  }

  @Post('gateway/test')
  @ApiOkResponse()
  testGateway(@Request() request, @Body() dto: TestPaymentGatewayDto) {
    return this.gatewayConfig.test(
      dto.provider,
      dto.credentials,
      dto.mode,
      request.user.id,
    );
  }

  @Post('gateway/activate')
  @ApiOkResponse()
  activateGateway(@Request() request, @Body() dto: ActivatePaymentGatewayDto) {
    return this.gatewayConfig.activate(dto.provider, request.user.id);
  }

  @Get('outbox')
  @ApiOkResponse()
  listOutbox(@Query('status') status?: string) {
    return this.paymentOutbox.list(status);
  }

  @Get('outbox/counts')
  @ApiOkResponse()
  outboxCounts() {
    return this.paymentOutbox.counts();
  }

  @Post('outbox/:id/retry')
  @ApiOkResponse()
  retryOutbox(@Param('id', ParseIntPipe) id: number) {
    return this.paymentOutbox.retry(id);
  }
}
