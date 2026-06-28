import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { StoreService } from '../services';

@ApiTags('Store')
@Controller({ path: 'store', version: '1' })
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('status')
  @ApiOkResponse()
  getStatus() {
    return this.storeService.getStatus();
  }
}
