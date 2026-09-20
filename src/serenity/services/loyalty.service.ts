import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTransactionEntity } from '../infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import { toLoyaltyActivityDto } from '../mappers';
import { LoyaltySettingsService } from './loyalty-settings.service';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly loyaltyRepository: Repository<LoyaltyTransactionEntity>,
    private readonly loyaltySettings: LoyaltySettingsService,
  ) {}

  async getBalance(userId: number): Promise<number> {
    const result = await this.loyaltyRepository
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.points), 0)', 'balance')
      .where('tx.userId = :userId', { userId })
      .getRawOne<{ balance: string }>();

    return Number(result?.balance ?? 0);
  }

  async getLoyalty(userId: number) {
    const transactions = await this.loyaltyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const balance = transactions.reduce((sum, tx) => sum + tx.points, 0);
    const rules = await this.loyaltySettings.getRules();

    return {
      summary: {
        balance,
        conversionLabel: `${rules.pointValueInr} Rs = 1 Loyalty Point`,
        pointValueInr: rules.pointValueInr,
        maxRedeemPercent: Math.round(rules.maxRedeemPercent * 100),
        note: 'Points gather quietly with each order and stay ready for a gentler return.',
      },
      activity: transactions.map(toLoyaltyActivityDto),
    };
  }
}
