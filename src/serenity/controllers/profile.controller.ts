import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ProfileService } from '../services';
import {
  UpdateDietPreferencesDto,
  UpdateProfileDto,
} from '../dto/serenity.dto';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'profile', version: '1' })
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

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
