import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { DiyQuoteDto } from '../dto/serenity.dto';
import { DiyService } from '../services/diy.service';

@ApiTags('DIY')
@Controller({ path: 'diy', version: '1' })
export class DiyController {
  constructor(private readonly diyService: DiyService) {}

  @Get('catalog')
  @ApiOkResponse()
  getCatalog(@Req() req: Request) {
    return this.diyService.getCatalog(this.assetBaseUrl(req));
  }

  @Post('quote')
  @ApiOkResponse()
  quote(@Body() dto: DiyQuoteDto) {
    return this.diyService.quote(dto);
  }

  @Get('assets/:fileName')
  @Header('Cache-Control', 'public, max-age=86400')
  sendAsset(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    res.sendFile(this.diyService.resolveAssetPath(fileName));
  }

  private assetBaseUrl(req: Request): string {
    const host = req.get('host');
    return `${req.protocol}://${host}/api/v1/diy/assets`;
  }
}
