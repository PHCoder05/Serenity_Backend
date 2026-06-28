import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetpoojaRepository } from '../petpooja.repository';
import {
  PetpoojaMenuItemStockSchema,
  PetpoojaMenuItemStockSchemaClass,
  PetpoojaMenuSnapshotSchema,
  PetpoojaMenuSnapshotSchemaClass,
  PetpoojaOrderSchema,
  PetpoojaOrderSchemaClass,
  PetpoojaRestaurantSchema,
  PetpoojaRestaurantSchemaClass,
} from './entities/petpooja.schema';
import { PetpoojaDocumentRepository } from './repositories/petpooja.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PetpoojaRestaurantSchemaClass.name,
        schema: PetpoojaRestaurantSchema,
      },
      {
        name: PetpoojaMenuSnapshotSchemaClass.name,
        schema: PetpoojaMenuSnapshotSchema,
      },
      {
        name: PetpoojaMenuItemStockSchemaClass.name,
        schema: PetpoojaMenuItemStockSchema,
      },
      {
        name: PetpoojaOrderSchemaClass.name,
        schema: PetpoojaOrderSchema,
      },
    ]),
  ],
  providers: [
    {
      provide: PetpoojaRepository,
      useClass: PetpoojaDocumentRepository,
    },
  ],
  exports: [PetpoojaRepository],
})
export class DocumentPetpoojaPersistenceModule {}
