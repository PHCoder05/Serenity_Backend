import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { UpdateLoyaltyRulesDto } from '../dto/serenity.dto';
import { LoyaltySettingsService } from '../services/loyalty-settings.service';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Admin Loyalty')
@Controller({ path: 'admin/loyalty', version: '1' })
export class AdminLoyaltyController {
  constructor(private readonly loyaltySettings: LoyaltySettingsService) {}

  @Get('rules')
  @ApiOkResponse()
  getRules() {
    return this.loyaltySettings.getRules();
  }

  @Put('rules')
  @ApiOkResponse()
  updateRules(@Body() dto: UpdateLoyaltyRulesDto) {
    return this.loyaltySettings.update(dto);
  }
}
