import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from '../services';
import {
  CancelOrderDto,
  CreateOrderDto,
  OrderQuoteDto,
  SubmitOrderFeedbackDto,
} from '../dto/serenity.dto';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';

@ApiTags('Orders')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('quote')
  @ApiOkResponse()
  @UseGuards(OptionalJwtAuthGuard)
  quote(@Request() request, @Body() dto: OrderQuoteDto) {
    const userId = request.user?.id as number | undefined;
    return this.ordersService.quote(dto, userId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse()
  create(
    @Request() request,
    @Body() dto: CreateOrderDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const userId = request.user?.id as number | undefined;
    return this.ordersService.create(userId, dto, idempotencyKey);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse()
  findAll(
    @Request() request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll(
      request.user.id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('guest/:token')
  @ApiOkResponse()
  findGuest(@Param('token') token: string) {
    return this.ordersService.findOneByGuestToken(token);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse()
  cancel(
    @Request() request,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancel(request.user.id, id, dto.reason);
  }

  @Post(':id/reorder')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse()
  reorder(@Request() request, @Param('id') id: string) {
    return this.ordersService.reorder(request.user.id, id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse()
  findOne(@Request() request, @Param('id') id: string) {
    return this.ordersService.findOne(request.user.id, id);
  }

  @Post(':id/feedback')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse()
  submitFeedback(
    @Request() request,
    @Param('id') id: string,
    @Body() dto: SubmitOrderFeedbackDto,
  ) {
    return this.ordersService.submitFeedback(request.user.id, id, dto);
  }
}
