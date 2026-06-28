import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { DietPreferenceEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/diet-preference.entity';
import { LoyaltyTransactionEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import { MenuItemEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/menu-item.entity';
import { OrderLineItemEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/order-line-item.entity';
import { SavedBowlEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/saved-bowl.entity';
import { SerenityOrderEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/serenity-order.entity';
import { StoreStatusEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/store-status.entity';
import { UserProfileEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/user-profile.entity';
import { SerenitySeedService } from './serenity-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MenuItemEntity,
      DietPreferenceEntity,
      StoreStatusEntity,
      UserEntity,
      UserProfileEntity,
      SerenityOrderEntity,
      OrderLineItemEntity,
      SavedBowlEntity,
      LoyaltyTransactionEntity,
    ]),
  ],
  providers: [SerenitySeedService],
  exports: [SerenitySeedService],
})
export class SerenitySeedModule {}
