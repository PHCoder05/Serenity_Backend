import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTransactionEntity } from '../infrastructure/persistence/relational/entities/loyalty-transaction.entity';
import { toLoyaltyActivityDto } from '../mappers';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly loyaltyRepository: Repository<LoyaltyTransactionEntity>,
  ) {}

  async getLoyalty(userId: number) {
    const transactions = await this.loyaltyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const balance = transactions.reduce((sum, tx) => sum + tx.points, 0);

    return {
      summary: {
        balance,
        conversionLabel: '1 Rs = 1 Loyalty Point',
        note: 'Points gather quietly with each order and stay ready for a gentler return.',
      },
      activity: transactions.map(toLoyaltyActivityDto),
    };
  }
}
