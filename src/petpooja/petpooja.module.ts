import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PetpoojaService } from './services/petpooja.service';
import { PetpoojaWebhookController } from './controllers/petpooja-webhook.controller';
import { PetpoojaOutboundController } from './controllers/petpooja-outbound.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [PetpoojaWebhookController, PetpoojaOutboundController],
  providers: [PetpoojaService],
  exports: [PetpoojaService],
})
export class PetpoojaModule {}
