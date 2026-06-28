import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
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
  ) {
    return this.menuService.findAll({
      category,
      mood,
      q,
      inStock: inStock === 'true' ? true : undefined,
    });
  }

  @Get('home')
  @ApiOkResponse()
  getHome() {
    return this.menuService.getHome();
  }

  @Get(':id')
  @ApiOkResponse()
  findOne(@Param('id') id: string) {
    return this.menuService.findOne(id);
  }
}
