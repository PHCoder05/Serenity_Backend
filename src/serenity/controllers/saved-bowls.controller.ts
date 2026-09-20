import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SavedBowlsService } from '../services';
import { UpsertSavedBowlDto } from '../dto/serenity.dto';

@ApiTags('Saved Bowls')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'saved-bowls', version: '1' })
export class SavedBowlsController {
  constructor(private readonly savedBowlsService: SavedBowlsService) {}

  @Get()
  @ApiOkResponse()
  findAll(@Request() request) {
    return this.savedBowlsService.findAll(request.user.id);
  }

  @Get(':id')
  @ApiOkResponse()
  findOne(@Request() request, @Param('id') id: string) {
    return this.savedBowlsService.findOne(request.user.id, id);
  }

  @Post()
  @ApiOkResponse()
  create(@Request() request, @Body() dto: UpsertSavedBowlDto) {
    return this.savedBowlsService.create(request.user.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse()
  update(
    @Request() request,
    @Param('id') id: string,
    @Body() dto: UpsertSavedBowlDto,
  ) {
    return this.savedBowlsService.update(request.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse()
  remove(@Request() request, @Param('id') id: string) {
    return this.savedBowlsService.remove(request.user.id, id);
  }
}
