import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { UpsertHomeMoodDto, UpsertHomeSettingsDto } from '../dto/serenity.dto';
import { ContentService } from '../services/content.service';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Admin Content')
@Controller({ path: 'admin/content', version: '1' })
export class AdminContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('moods')
  @ApiOkResponse()
  listMoods() {
    return this.contentService.listMoods(true);
  }

  @Put('moods/:id')
  @ApiOkResponse()
  upsertMood(@Param('id') id: string, @Body() dto: UpsertHomeMoodDto) {
    return this.contentService.upsertMood(id, dto);
  }

  @Get('home')
  @ApiOkResponse()
  getHomeSettings() {
    return this.contentService.getSettings();
  }

  @Put('home')
  @ApiOkResponse()
  upsertHomeSettings(@Body() dto: UpsertHomeSettingsDto) {
    return this.contentService.upsertSettings(dto);
  }
}
