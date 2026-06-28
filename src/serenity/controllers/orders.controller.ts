import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from '../services';
import {
  CreateOrderDto,
  OrderQuoteDto,
  SubmitOrderFeedbackDto,
} from '../dto/serenity.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('quote')
  @ApiOkResponse()
  quote(@Body() dto: OrderQuoteDto) {
    return this.ordersService.quote(dto);
  }

  @Post()
  @ApiOkResponse()
  create(
    @Request() request,
    @Body() dto: CreateOrderDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(request.user.id, dto, idempotencyKey);
  }

  @Get()
  @ApiOkResponse()
  findAll(@Request() request) {
    return this.ordersService.findAll(request.user.id);
  }

  @Get(':id')
  @ApiOkResponse()
  findOne(@Request() request, @Param('id') id: string) {
    return this.ordersService.findOne(request.user.id, id);
  }

  @Post(':id/feedback')
  @ApiOkResponse()
  submitFeedback(
    @Request() request,
    @Param('id') id: string,
    @Body() dto: SubmitOrderFeedbackDto,
  ) {
    return this.ordersService.submitFeedback(request.user.id, id, dto);
  }
}
