import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from '../services';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'loyalty', version: '1' })
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  @ApiOkResponse()
  getLoyalty(@Request() request) {
    return this.loyaltyService.getLoyalty(request.user.id);
  }
}
