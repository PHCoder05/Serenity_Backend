import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AllConfigType } from '../../config/config.type';
import { LoyaltySettingsEntity } from '../infrastructure/persistence/relational/entities/loyalty-settings.entity';
import { LoyaltyRules } from '../loyalty.rules';
import { UpdateLoyaltyRulesDto } from '../dto/serenity.dto';

@Injectable()
export class LoyaltySettingsService {
  constructor(
    @InjectRepository(LoyaltySettingsEntity)
    private readonly settingsRepository: Repository<LoyaltySettingsEntity>,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async getRules(): Promise<LoyaltyRules & { source: 'db' | 'env' }> {
    const row = await this.settingsRepository.findOne({ where: { id: 1 } });
    if (row) {
      return {
        pointValueInr: row.pointValueInr,
        maxRedeemPercent: row.maxRedeemPercent,
        earnRate: row.earnRate,
        source: 'db',
      };
    }
    return {
      pointValueInr: this.configService.getOrThrow(
        'serenity.loyaltyPointValueInr',
        { infer: true },
      ),
      maxRedeemPercent: this.configService.getOrThrow(
        'serenity.loyaltyMaxRedeemPercent',
        { infer: true },
      ),
      earnRate: this.configService.getOrThrow('serenity.loyaltyEarnRate', {
        infer: true,
      }),
      source: 'env',
    };
  }

  async update(dto: UpdateLoyaltyRulesDto) {
    let row = await this.settingsRepository.findOne({ where: { id: 1 } });
    if (!row) {
      row = this.settingsRepository.create({
        id: 1,
        pointValueInr: 1,
        maxRedeemPercent: 0.2,
        earnRate: 0.2,
      });
    }
    if (dto.pointValueInr !== undefined) {
      row.pointValueInr = dto.pointValueInr;
    }
    if (dto.maxRedeemPercent !== undefined) {
      row.maxRedeemPercent = dto.maxRedeemPercent;
    }
    if (dto.earnRate !== undefined) {
      row.earnRate = dto.earnRate;
    }
    await this.settingsRepository.save(row);
    return this.getRules();
  }
}
