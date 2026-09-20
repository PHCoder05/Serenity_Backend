import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { UpdateEventAdminDto } from '../dto/serenity.dto';
import { EventsService } from '../services';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Admin Events')
@Controller({ path: 'admin/events', version: '1' })
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOkResponse()
  list() {
    return this.eventsService.adminList();
  }

  @Get(':id/bookings')
  @ApiOkResponse()
  listBookings(@Param('id') id: string) {
    return this.eventsService.adminListBookings(id);
  }

  @Patch(':id')
  @ApiOkResponse()
  update(@Param('id') id: string, @Body() dto: UpdateEventAdminDto) {
    return this.eventsService.adminUpdate(id, dto);
  }
}
