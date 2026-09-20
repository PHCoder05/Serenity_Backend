import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreStatusEntity } from '../infrastructure/persistence/relational/entities/store-status.entity';
import { OutletsService } from './outlets.service';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
    private readonly outletsService: OutletsService,
  ) {}

  async getStatus(outletId?: string) {
    const outlet = await this.outletsService.resolveOutletId(outletId);
    const store = await this.outletsService.ensureStoreStatus(outlet.id);

    return {
      outletId: outlet.id,
      outletName: outlet.name,
      isOpen: store.isOpen,
      message: store.message ?? undefined,
      nextOpenAt: store.nextOpenAt?.toISOString(),
    };
  }

  async getStoreEntityForOutlet(outletId: string): Promise<StoreStatusEntity> {
    return this.outletsService.ensureStoreStatus(outletId);
  }
}
