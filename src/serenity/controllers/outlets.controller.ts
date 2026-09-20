import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OutletsService } from '../services/outlets.service';

@ApiTags('Outlets')
@Controller({ path: 'outlets', version: '1' })
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  @ApiOkResponse()
  list() {
    return this.outletsService.list();
  }

  @Get(':idOrSlug')
  @ApiOkResponse()
  get(@Param('idOrSlug') idOrSlug: string) {
    return this.outletsService.get(idOrSlug);
  }
}
