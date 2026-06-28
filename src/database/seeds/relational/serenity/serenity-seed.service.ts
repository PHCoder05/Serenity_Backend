import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { DietPreferenceEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/diet-preference.entity';
import { LoyaltyTransactionEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import { MenuItemEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/menu-item.entity';
import { OrderLineItemEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/order-line-item.entity';
import { SavedBowlEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/saved-bowl.entity';
import { SerenityOrderEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/serenity-order.entity';
import { StoreStatusEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/store-status.entity';
import { UserProfileEntity } from '../../../../serenity/infrastructure/persistence/relational/entities/user-profile.entity';
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  DIET_PREFERENCES_SEED,
  MENU_ITEMS_SEED,
} from './serenity-seed.data';

@Injectable()
export class SerenitySeedService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuRepository: Repository<MenuItemEntity>,
    @InjectRepository(DietPreferenceEntity)
    private readonly dietRepository: Repository<DietPreferenceEntity>,
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profileRepository: Repository<UserProfileEntity>,
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository: Repository<SerenityOrderEntity>,
    @InjectRepository(OrderLineItemEntity)
    private readonly lineItemRepository: Repository<OrderLineItemEntity>,
    @InjectRepository(SavedBowlEntity)
    private readonly savedBowlRepository: Repository<SavedBowlEntity>,
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly loyaltyRepository: Repository<LoyaltyTransactionEntity>,
  ) {}

  async run() {
    await this.seedMenu();
    await this.seedDietPreferences();
    await this.seedStoreStatus();
    const demoUser = await this.seedDemoUser();
    if (demoUser) {
      await this.seedProfile(demoUser.id);
      await this.seedOrders(demoUser.id);
      await this.seedSavedBowls(demoUser.id);
      await this.seedLoyalty(demoUser.id);
    }
  }

  private async seedMenu() {
    const count = await this.menuRepository.count();
    if (count > 0) return;

    await this.menuRepository.save(
      MENU_ITEMS_SEED.map((item) => {
        const entry = item as typeof item & {
          variants?: { id: string; label: string; priceDelta: number }[];
          extras?: { id: string; label: string; price: number }[];
        };

        return this.menuRepository.create({
          ...entry,
          moods: [...entry.moods],
          variants: entry.variants ? [...entry.variants] : null,
          extras: entry.extras ? [...entry.extras] : null,
          inStock: true,
        });
      }),
    );
  }

  private async seedDietPreferences() {
    const count = await this.dietRepository.count();
    if (count > 0) return;

    await this.dietRepository.save(
      DIET_PREFERENCES_SEED.map((item) => this.dietRepository.create(item)),
    );
  }

  private async seedStoreStatus() {
    const existing = await this.storeRepository.findOne({ where: { id: 1 } });
    if (existing) return;

    await this.storeRepository.save(
      this.storeRepository.create({
        id: 1,
        isOpen: true,
        message: null,
      }),
    );
  }

  private async seedDemoUser() {
    let user = await this.userRepository.findOne({
      where: { email: DEMO_USER_EMAIL },
    });

    if (!user) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash(DEMO_USER_PASSWORD, salt);

      user = await this.userRepository.save(
        this.userRepository.create({
          firstName: 'Aarav',
          lastName: 'Menon',
          email: DEMO_USER_EMAIL,
          password,
          role: { id: RoleEnum.user, name: 'User' },
          status: { id: StatusEnum.active, name: 'Active' },
        }),
      );
    }

    return user;
  }

  private async seedProfile(userId: number) {
    const existing = await this.profileRepository.findOne({
      where: { userId },
    });
    if (existing) return;

    await this.profileRepository.save(
      this.profileRepository.create({
        userId,
        phone: '+91 98765 43210',
        defaultAddress: '12th Main Road, Koramangala, Bengaluru',
        dietPreferenceIds: ['vegetarian', 'mild-spice'],
      }),
    );
  }

  private async seedOrders(userId: number) {
    const count = await this.orderRepository.count({ where: { userId } });
    if (count > 0) return;

    const orders: Array<{
      order: Partial<SerenityOrderEntity>;
      lines: Array<Partial<OrderLineItemEntity>>;
    }> = [
      {
        order: {
          id: 'order-1204',
          userId,
          status: 'confirmed',
          orderedAt: new Date('2026-04-24T13:35:00'),
          itemSummary: 'Veg Rice Bowl x 1',
          note: 'With mild chilli oil',
          total: 430,
          quantity: 1,
          subtotal: 440,
          couponDiscount: -20,
          gst: 10,
          amountPaid: 430,
          paidVia: 'UPI',
        },
        lines: [
          {
            title: 'Rice Bowl',
            quantity: 1,
            linePrice: 120,
            ingredients: ['Steamed rice', 'paneer', 'tandoori gravy', 'Herbs'],
          },
          {
            title: 'DIY Bowl',
            quantity: 1,
            linePrice: 320,
            ingredients: ['Steamed rice', 'paneer', 'tandoori gravy', 'Herbs'],
          },
          {
            title: 'DIY Bowl',
            quantity: 1,
            linePrice: 320,
            ingredients: ['Steamed rice', 'paneer', 'tandoori gravy', 'Herbs'],
          },
        ],
      },
      {
        order: {
          id: 'order-1198',
          userId,
          status: 'confirmed',
          orderedAt: new Date('2026-03-20T11:09:00'),
          itemSummary: 'Miso Rice Bowl x 1',
          note: 'Extra sesame greens',
          total: 430,
          quantity: 1,
          subtotal: 440,
          couponDiscount: -20,
          gst: 10,
          amountPaid: 430,
          paidVia: 'UPI',
        },
        lines: [
          {
            title: 'Miso Rice Bowl',
            quantity: 1,
            linePrice: 320,
            ingredients: [
              'Steamed rice',
              'mushrooms',
              'sesame greens',
              'Herbs',
            ],
          },
          {
            title: 'DIY Bowl',
            quantity: 1,
            linePrice: 120,
            ingredients: ['Steamed rice', 'paneer', 'tandoori gravy', 'Herbs'],
          },
        ],
      },
      {
        order: {
          id: 'order-1189',
          userId,
          status: 'confirmed',
          orderedAt: new Date('2026-03-14T20:16:00'),
          itemSummary: 'Slow Lunch Plate x 1',
          note: 'No onion garnish',
          total: 430,
          quantity: 1,
          subtotal: 440,
          couponDiscount: -20,
          gst: 10,
          amountPaid: 430,
          paidVia: 'UPI',
        },
        lines: [
          {
            title: 'Slow Lunch Plate',
            quantity: 1,
            linePrice: 320,
            ingredients: ['Steamed rice', 'paneer', 'tandoori gravy', 'Herbs'],
          },
          {
            title: 'DIY Bowl',
            quantity: 1,
            linePrice: 120,
            ingredients: ['Steamed rice', 'paneer', 'tandoori gravy', 'Herbs'],
          },
        ],
      },
    ];

    for (const entry of orders) {
      await this.orderRepository.save(this.orderRepository.create(entry.order));
      await this.lineItemRepository.save(
        entry.lines.map((line) =>
          this.lineItemRepository.create({
            ...line,
            orderId: entry.order.id as string,
          }),
        ),
      );
    }
  }

  private async seedSavedBowls(userId: number) {
    const count = await this.savedBowlRepository.count({ where: { userId } });
    if (count > 0) return;

    const bowls = [
      {
        id: 'golden-lentil-bowl',
        userId,
        title: 'Golden Lentil Bowl',
        note: 'Turmeric rice and lemon tahini',
        subtitle: 'Saved on : 19th April 2026',
        description:
          'A warm bowl with roasted squash, lentils, and a little brightness.',
        price: 420,
        image:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
        ingredients: [
          'Turmeric rice',
          'Roasted squash',
          'Slow lentils',
          'Fresh herbs',
          'Lemon tahini',
        ],
        addons: ['Avocado slices', 'Seed crisp'],
        savedNote:
          'Saved for slower afternoons when you want something warm and familiar.',
      },
      {
        id: 'market-greens-bowl',
        userId,
        title: 'Market Greens Bowl',
        note: 'Greens, avocado, and citrus',
        subtitle: 'Saved on : 19th April 2026',
        description: 'A brighter bowl for days that need lift without noise.',
        price: 460,
        image:
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
        ingredients: [
          'Charred greens',
          'Soft grains',
          'Avocado',
          'Citrus dressing',
          'Pickled onion',
        ],
        addons: ['Toasted seeds', 'Extra citrus dressing'],
        savedNote:
          'Saved when you want something clearer and a little more refreshing.',
      },
      {
        id: 'miso-rice-bowl',
        userId,
        title: 'Miso Rice Bowl',
        note: 'Mushrooms and sesame greens',
        subtitle: 'Last Ordered: 2 weeks ago',
        description:
          'Sticky rice, glazed mushrooms, and warm broth for quieter evenings.',
        price: 445,
        image:
          'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
        ingredients: [
          'Sticky rice',
          'Glazed mushrooms',
          'Sesame greens',
          'Warm broth',
          'Scallion finish',
        ],
        addons: ['Soft egg', 'Mild kimchi'],
        savedNote:
          'Saved as an evening favorite when you want something grounding.',
      },
    ];

    await this.savedBowlRepository.save(
      bowls.map((bowl) => this.savedBowlRepository.create(bowl)),
    );
  }

  private async seedLoyalty(userId: number) {
    const count = await this.loyaltyRepository.count({ where: { userId } });
    if (count > 0) return;

    await this.loyaltyRepository.save([
      this.loyaltyRepository.create({
        userId,
        label: 'Slow Lunch Plate',
        points: 96,
        createdAt: new Date(),
      }),
      this.loyaltyRepository.create({
        userId,
        label: 'Golden Lentil Bowl',
        points: 72,
        createdAt: new Date(Date.now() - 86400000),
      }),
      this.loyaltyRepository.create({
        userId,
        label: 'Warm Ginger Tea',
        points: 24,
        createdAt: new Date(Date.now() - 2 * 86400000),
      }),
      this.loyaltyRepository.create({
        userId,
        label: 'Welcome bonus',
        points: 250,
        createdAt: new Date(Date.now() - 30 * 86400000),
      }),
    ]);
  }
}
