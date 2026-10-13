import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTransactionEntity } from '../infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import { toLoyaltyActivityDto } from '../mappers';
import { LoyaltySettingsService } from './loyalty-settings.service';
import { activeLoyaltyPoints, loyaltyExpiryCutoff } from '../loyalty.rules';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly loyaltyRepository: Repository<LoyaltyTransactionEntity>,
    private readonly loyaltySettings: LoyaltySettingsService,
  ) {}

  async getBalance(userId: number): Promise<number> {
    const rules = await this.loyaltySettings.getRules();
    const cutoff = loyaltyExpiryCutoff(rules.expiryDays);
    const qb = this.loyaltyRepository
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.points), 0)', 'balance')
      .where('tx.userId = :userId', { userId });
    if (cutoff) {
      qb.andWhere('(tx.points < 0 OR tx.createdAt >= :cutoff)', { cutoff });
    }
    const result = await qb.getRawOne<{ balance: string }>();
    return Math.max(0, Number(result?.balance ?? 0));
  }

  async getLoyalty(userId: number) {
    const transactions = await this.loyaltyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const rules = await this.loyaltySettings.getRules();
    const { balance, activity } = activeLoyaltyPoints(
      transactions,
      loyaltyExpiryCutoff(rules.expiryDays),
    );

    return {
      summary: {
        balance,
        conversionLabel: `${rules.pointValueInr} Rs = 1 Loyalty Point`,
        pointValueInr: rules.pointValueInr,
        maxRedeemPercent: Math.round(rules.maxRedeemPercent * 100),
        expiryDays: rules.expiryDays ?? null,
        note: 'Points gather quietly with each order and stay ready for a gentler return.',
      },
      activity: activity.map(toLoyaltyActivityDto),
    };
  }
}
