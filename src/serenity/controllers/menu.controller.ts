import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CAMPUS_DELIVERY_LOCATIONS } from '../campus-locations';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { MenuService } from '../services';

@ApiTags('Menu')
@Controller({ path: 'menu', version: '1' })
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOkResponse()
  findAll(
    @Query('category') category?: string,
    @Query('mood') mood?: string,
    @Query('q') q?: string,
    @Query('inStock') inStock?: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.menuService.findAll({
      category,
      mood,
      q,
      inStock: inStock === 'true' ? true : undefined,
      outletId,
    });
  }

  @Get('home')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse()
  getHome(@Request() request, @Query('outletId') outletId?: string) {
    const userId = request.user?.id as number | undefined;
    return this.menuService.getHome(userId, outletId);
  }

  @Get('delivery-locations')
  @ApiOkResponse()
  deliveryLocations() {
    return { data: CAMPUS_DELIVERY_LOCATIONS };
  }

  @Get(':id')
  @ApiOkResponse()
  findOne(@Param('id') id: string, @Query('outletId') outletId?: string) {
    return this.menuService.findOne(id, outletId);
  }
}
