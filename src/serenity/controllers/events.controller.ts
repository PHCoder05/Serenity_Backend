import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { EventsService } from '../services';
import { CreateEventBookingDto, CreateEventDto } from '../dto/serenity.dto';

@ApiTags('Events')
@Controller({ path: 'events', version: '1' })
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOkResponse()
  findAll(
    @Query('audience') audience?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.eventsService.findAll({ audience, status, q });
  }

  @Get(':id/availability')
  @ApiOkResponse()
  getAvailability(@Param('id') id: string) {
    return this.eventsService.getAvailability(id);
  }

  @Get(':id')
  @ApiOkResponse()
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse()
  create(@Request() request, @Body() dto: CreateEventDto) {
    return this.eventsService.create(request.user.id, dto);
  }

  @Post(':id/bookings')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse()
  createBooking(
    @Request() request,
    @Param('id') id: string,
    @Body() dto: CreateEventBookingDto,
  ) {
    return this.eventsService.createBooking(request.user.id, id, dto);
  }

  @Post(':id/bookings/:bookingId/cancel')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse()
  cancelBooking(
    @Request() request,
    @Param('id') id: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.eventsService.cancelBooking(request.user.id, id, bookingId);
  }

  @Post(':id/bookings/:bookingId/confirm')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOkResponse()
  confirmBooking(
    @Param('id') id: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.eventsService.confirmWaitlistedBooking(id, bookingId);
  }
}
