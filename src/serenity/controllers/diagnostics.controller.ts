import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DiagnosticsService } from '../services';

@ApiTags('Diagnostics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'diagnostics', version: '1' })
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get()
  @ApiOkResponse()
  getSnapshot() {
    return this.diagnosticsService.getSnapshot();
  }
}
