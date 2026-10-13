import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ProfileService } from '../services';
import { NotificationsService } from '../services/notifications.service';
import {
  UpdateDietPreferencesDto,
  UpdateProfileDto,
} from '../dto/serenity.dto';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'profile', version: '1' })
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @ApiOkResponse()
  getProfile(@Request() request) {
    return this.profileService.getProfile(request.user.id);
  }

  @Patch()
  @ApiOkResponse()
  updateProfile(@Request() request, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(request.user.id, dto);
  }

  @Get('notifications')
  @ApiOkResponse()
  listNotifications(@Request() request) {
    return this.notificationsService.list(request.user.id);
  }

  @Post('notifications/read-all')
  @ApiOkResponse()
  markAllRead(@Request() request) {
    return this.notificationsService.markAllRead(request.user.id);
  }

  @Post('notifications/:id/read')
  @ApiOkResponse()
  markRead(@Request() request, @Param('id') id: string) {
    return this.notificationsService.markRead(request.user.id, id);
  }

  @Get('diet-preferences')
  @ApiOkResponse()
  getDietPreferences(@Request() request) {
    return this.profileService.getDietPreferences(request.user.id);
  }

  @Put('diet-preferences')
  @ApiOkResponse()
  updateDietPreferences(
    @Request() request,
    @Body() dto: UpdateDietPreferencesDto,
  ) {
    return this.profileService.updateDietPreferences(request.user.id, dto);
  }
}
