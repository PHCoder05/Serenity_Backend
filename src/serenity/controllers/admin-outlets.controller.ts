import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { UpsertOutletDto } from '../dto/serenity.dto';
import { OutletsService } from '../services/outlets.service';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Admin Outlets')
@Controller({ path: 'admin/outlets', version: '1' })
export class AdminOutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Put(':id')
  @ApiOkResponse()
  upsert(@Param('id') id: string, @Body() dto: UpsertOutletDto) {
    return this.outletsService.upsert(id, dto);
  }
}
