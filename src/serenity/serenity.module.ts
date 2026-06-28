import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetpoojaModule } from '../petpooja/petpooja.module';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { MenuItemEntity } from './infrastructure/persistence/relational/entities/menu-item.entity';
import { DietPreferenceEntity } from './infrastructure/persistence/relational/entities/diet-preference.entity';
import { UserProfileEntity } from './infrastructure/persistence/relational/entities/user-profile.entity';
import { StoreStatusEntity } from './infrastructure/persistence/relational/entities/store-status.entity';
import { SerenityOrderEntity } from './infrastructure/persistence/relational/entities/serenity-order.entity';
import { OrderLineItemEntity } from './infrastructure/persistence/relational/entities/order-line-item.entity';
import { SavedBowlEntity } from './infrastructure/persistence/relational/entities/saved-bowl.entity';
import { LoyaltyTransactionEntity } from './infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import { EventEntity } from './infrastructure/persistence/relational/entities/event.entity';
import { EventBookingEntity } from './infrastructure/persistence/relational/entities/event-booking.entity';
import { PaymentIntentEntity } from './infrastructure/persistence/relational/entities/payment-intent.entity';
import { MenuController } from './controllers/menu.controller';
import { OrdersController } from './controllers/orders.controller';
import { ProfileController } from './controllers/profile.controller';
import { SavedBowlsController } from './controllers/saved-bowls.controller';
import { LoyaltyController } from './controllers/loyalty.controller';
import { StoreController } from './controllers/store.controller';
import { EventsController } from './controllers/events.controller';
import { PaymentsController } from './controllers/payments.controller';
import { DiagnosticsController } from './controllers/diagnostics.controller';
import {
  DiagnosticsService,
  EventsService,
  LoyaltyService,
  MenuService,
  OrdersService,
  PaymentsService,
  ProfileService,
  SavedBowlsService,
  StoreService,
} from './services';

@Module({
  imports: [
    PetpoojaModule,
    TypeOrmModule.forFeature([
      MenuItemEntity,
      DietPreferenceEntity,
      UserProfileEntity,
      StoreStatusEntity,
      SerenityOrderEntity,
      OrderLineItemEntity,
      SavedBowlEntity,
      LoyaltyTransactionEntity,
      EventEntity,
      EventBookingEntity,
      PaymentIntentEntity,
      UserEntity,
    ]),
  ],
  controllers: [
    MenuController,
    OrdersController,
    ProfileController,
    SavedBowlsController,
    LoyaltyController,
    StoreController,
    EventsController,
    PaymentsController,
    DiagnosticsController,
  ],
  providers: [
    MenuService,
    OrdersService,
    ProfileService,
    SavedBowlsService,
    LoyaltyService,
    StoreService,
    EventsService,
    PaymentsService,
    DiagnosticsService,
  ],
  exports: [MenuService, OrdersService, ProfileService],
})
export class SerenityModule {}
