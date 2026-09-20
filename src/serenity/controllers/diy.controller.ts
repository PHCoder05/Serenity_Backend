import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DiyService } from '../services/diy.service';

@ApiTags('DIY')
@Controller({ path: 'diy', version: '1' })
export class DiyController {
  constructor(private readonly diyService: DiyService) {}

  @Get('catalog')
  @ApiOkResponse()
  getCatalog() {
    return this.diyService.getCatalog();
  }
}
