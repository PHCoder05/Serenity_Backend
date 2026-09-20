import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
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
import { PaymentGatewayConfigEntity } from './infrastructure/persistence/relational/entities/payment-gateway-config.entity';
import { PaymentWebhookEventEntity } from './infrastructure/persistence/relational/entities/payment-webhook-event.entity';
import { PaymentGatewayAuditEntity } from './infrastructure/persistence/relational/entities/payment-gateway-audit.entity';
import { PaymentOutboxEntity } from './infrastructure/persistence/relational/entities/payment-outbox.entity';
import { OrderStatusHistoryEntity } from './infrastructure/persistence/relational/entities/order-status-history.entity';
import { CouponEntity } from './infrastructure/persistence/relational/entities/coupon.entity';
import { OutletEntity } from './infrastructure/persistence/relational/entities/outlet.entity';
import { LoyaltySettingsEntity } from './infrastructure/persistence/relational/entities/loyalty-settings.entity';
import { HomeMoodEntity } from './infrastructure/persistence/relational/entities/home-mood.entity';
import { MenuController } from './controllers/menu.controller';
import { OrdersController } from './controllers/orders.controller';
import { ProfileController } from './controllers/profile.controller';
import { SavedBowlsController } from './controllers/saved-bowls.controller';
import { LoyaltyController } from './controllers/loyalty.controller';
import { StoreController } from './controllers/store.controller';
import { EventsController } from './controllers/events.controller';
import { PaymentsController } from './controllers/payments.controller';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { AdminCouponsController } from './controllers/admin-coupons.controller';
import { AdminOutletsController } from './controllers/admin-outlets.controller';
import { AdminLoyaltyController } from './controllers/admin-loyalty.controller';
import { AdminEventsController } from './controllers/admin-events.controller';
import { AdminContentController } from './controllers/admin-content.controller';
import { AdminSupportController } from './controllers/admin-support.controller';
import { OutletsController } from './controllers/outlets.controller';
import { DiagnosticsController } from './controllers/diagnostics.controller';
import { DiyController } from './controllers/diy.controller';
import {
  DiagnosticsService,
  DiyService,
  EventsService,
  LoyaltyService,
  MenuService,
  OrdersService,
  PaymentsService,
  ProfileService,
  SavedBowlsService,
  StoreService,
} from './services';
import { CouponService } from './services/coupon.service';
import { OutletsService } from './services/outlets.service';
import { LoyaltySettingsService } from './services/loyalty-settings.service';
import { ContentService } from './services/content.service';
import { SupportService } from './services/support.service';
import { PaymentGatewayRegistry } from './payments/gateway/payment-gateway.registry';
import { PaymentGatewayConfigService } from './payments/gateway/payment-gateway-config.service';
import { PaymentOutboxService } from './payments/outbox/payment-outbox.service';

@Module({
  imports: [
    AuthModule,
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
      PaymentGatewayConfigEntity,
      PaymentWebhookEventEntity,
      PaymentGatewayAuditEntity,
      PaymentOutboxEntity,
      OrderStatusHistoryEntity,
      CouponEntity,
      OutletEntity,
      LoyaltySettingsEntity,
      HomeMoodEntity,
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
    OutletsController,
    EventsController,
    PaymentsController,
    AdminPaymentsController,
    AdminCouponsController,
    AdminOutletsController,
    AdminLoyaltyController,
    AdminEventsController,
    AdminContentController,
    AdminSupportController,
    DiyController,
    DiagnosticsController,
  ],
  providers: [
    MenuService,
    OrdersService,
    ProfileService,
    SavedBowlsService,
    LoyaltyService,
    LoyaltySettingsService,
    ContentService,
    SupportService,
    StoreService,
    OutletsService,
    EventsService,
    PaymentsService,
    DiyService,
    DiagnosticsService,
    CouponService,
    PaymentGatewayRegistry,
    PaymentGatewayConfigService,
    PaymentOutboxService,
  ],
  exports: [MenuService, OrdersService, ProfileService, OutletsService],
})
export class SerenityModule {}
