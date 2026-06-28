import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from '../database/config/database.config';
import { DatabaseConfig } from '../database/config/database-config.type';
import { MenuItemEntity } from '../serenity/infrastructure/persistence/relational/entities/menu-item.entity';
import { SerenityOrderEntity } from '../serenity/infrastructure/persistence/relational/entities/serenity-order.entity';
import { StoreStatusEntity } from '../serenity/infrastructure/persistence/relational/entities/store-status.entity';
import { UserProfileEntity } from '../serenity/infrastructure/persistence/relational/entities/user-profile.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { PetpoojaService } from './services/petpooja.service';
import { PetpoojaWebhookService } from './services/petpooja-webhook.service';
import { PetpoojaMenuSyncService } from './services/petpooja-menu-sync.service';
import { PetpoojaOrderOutboundService } from './services/petpooja-order-outbound.service';
import { PetpoojaSerenityOrderService } from './services/petpooja-serenity-order.service';
import { PetpoojaWebhookController } from './controllers/petpooja-webhook.controller';
import { PetpoojaOutboundController } from './controllers/petpooja-outbound.controller';
import { PetpoojaAuthGuard } from './guards/petpooja-auth.guard';
import { RelationalPetpoojaPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DocumentPetpoojaPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentPetpoojaPersistenceModule
  : RelationalPetpoojaPersistenceModule;

const isRelationalDatabase = !(databaseConfig() as DatabaseConfig)
  .isDocumentDatabase;

const relationalEntities = [
  MenuItemEntity,
  SerenityOrderEntity,
  StoreStatusEntity,
  UserEntity,
  UserProfileEntity,
];

const serenityBridgeImports = isRelationalDatabase
  ? [TypeOrmModule.forFeature(relationalEntities)]
  : [];

const serenityBridgeProviders = isRelationalDatabase
  ? [
      PetpoojaMenuSyncService,
      PetpoojaOrderOutboundService,
      PetpoojaSerenityOrderService,
    ]
  : [];
// </database-block>

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    infrastructurePersistenceModule,
    ...serenityBridgeImports,
  ],
  controllers: [PetpoojaWebhookController, PetpoojaOutboundController],
  providers: [
    PetpoojaService,
    PetpoojaWebhookService,
    ...serenityBridgeProviders,
    PetpoojaAuthGuard,
  ],
  exports: [
    PetpoojaService,
    PetpoojaWebhookService,
    ...(isRelationalDatabase
      ? [
          PetpoojaMenuSyncService,
          PetpoojaOrderOutboundService,
          PetpoojaSerenityOrderService,
        ]
      : []),
  ],
})
export class PetpoojaModule {}
