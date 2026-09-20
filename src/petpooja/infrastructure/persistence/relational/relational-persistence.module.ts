import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetpoojaRepository } from '../petpooja.repository';
import { PetpoojaMenuItemStockEntity } from './entities/petpooja-menu-item-stock.entity';
import { PetpoojaMenuSnapshotEntity } from './entities/petpooja-menu-snapshot.entity';
import { PetpoojaOrderEntity } from './entities/petpooja-order.entity';
import { PetpoojaRestaurantEntity } from './entities/petpooja-restaurant.entity';
import { PetpoojaRelationalRepository } from './repositories/petpooja.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PetpoojaRestaurantEntity,
      PetpoojaMenuSnapshotEntity,
      PetpoojaMenuItemStockEntity,
      PetpoojaOrderEntity,
    ]),
  ],
  providers: [
    {
      provide: PetpoojaRepository,
      useClass: PetpoojaRelationalRepository,
    },
  ],
  exports: [PetpoojaRepository],
})
export class RelationalPetpoojaPersistenceModule {}
