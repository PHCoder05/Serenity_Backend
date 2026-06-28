import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreStatusEntity } from '../infrastructure/persistence/relational/entities/store-status.entity';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
  ) {}

  async getStatus() {
    const store =
      (await this.storeRepository.findOne({ where: { id: 1 } })) ??
      (await this.storeRepository.save(
        this.storeRepository.create({ id: 1, isOpen: true }),
      ));

    return {
      isOpen: store.isOpen,
      message: store.message ?? undefined,
      nextOpenAt: store.nextOpenAt?.toISOString(),
    };
  }
}
