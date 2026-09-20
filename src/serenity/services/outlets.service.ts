import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutletEntity } from '../infrastructure/persistence/relational/entities/outlet.entity';
import { StoreStatusEntity } from '../infrastructure/persistence/relational/entities/store-status.entity';
import { UpsertOutletDto } from '../dto/serenity.dto';

@Injectable()
export class OutletsService {
  constructor(
    @InjectRepository(OutletEntity)
    private readonly outletRepository: Repository<OutletEntity>,
    @InjectRepository(StoreStatusEntity)
    private readonly storeRepository: Repository<StoreStatusEntity>,
  ) {}

  async list() {
    const rows = await this.outletRepository.find({
      where: { isActive: true },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
    return { data: rows.map((row) => this.toPublicDto(row)) };
  }

  async get(idOrSlug: string) {
    const outlet = await this.findByIdOrSlug(idOrSlug);
    if (!outlet || !outlet.isActive) {
      throw new NotFoundException({
        message: 'Outlet not found',
        code: 'OUTLET_NOT_FOUND',
      });
    }
    return this.toPublicDto(outlet);
  }

  async resolveOutletId(outletId?: string | null): Promise<OutletEntity> {
    if (outletId?.trim()) {
      const found = await this.outletRepository.findOne({
        where: [{ id: outletId.trim() }, { slug: outletId.trim() }],
      });
      if (!found || !found.isActive) {
        throw new BadRequestException({
          message: `Unknown outlet: ${outletId}`,
          code: 'OUTLET_INVALID',
        });
      }
      return found;
    }

    const fallback =
      (await this.outletRepository.findOne({ where: { isDefault: true } })) ??
      (await this.outletRepository.findOne({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      }));

    if (!fallback) {
      throw new BadRequestException({
        message: 'No active outlet configured',
        code: 'OUTLET_INVALID',
      });
    }
    return fallback;
  }

  async findByPetpoojaRestId(restId: string): Promise<OutletEntity | null> {
    if (!restId?.trim()) {
      return null;
    }
    return this.outletRepository.findOne({
      where: { petpoojaRestId: restId.trim() },
    });
  }

  async upsert(id: string, dto: UpsertOutletDto) {
    const outletId = id.trim();
    if (!outletId) {
      throw new BadRequestException('Outlet id is required');
    }

    let row = await this.outletRepository.findOne({ where: { id: outletId } });
    if (!row) {
      row = this.outletRepository.create({ id: outletId });
    }

    row.slug = dto.slug.trim().toLowerCase();
    row.name = dto.name.trim();
    row.address = dto.address?.trim() || null;
    row.petpoojaRestId = dto.petpoojaRestId?.trim() || null;
    row.isActive = dto.isActive ?? true;

    if (dto.isDefault) {
      await this.outletRepository.update(
        { isDefault: true },
        { isDefault: false },
      );
      row.isDefault = true;
    } else if (dto.isDefault === false) {
      row.isDefault = false;
    }

    const saved = await this.outletRepository.save(row);
    await this.ensureStoreStatus(saved.id);
    return this.toAdminDto(saved);
  }

  async ensureStoreStatus(outletId: string): Promise<StoreStatusEntity> {
    const byOutlet = await this.storeRepository.findOne({
      where: { outletId },
    });
    if (byOutlet) {
      return byOutlet;
    }

    const legacy = await this.storeRepository.findOne({ where: { id: 1 } });
    if (legacy && !legacy.outletId) {
      legacy.outletId = outletId;
      return this.storeRepository.save(legacy);
    }

    const raw = await this.storeRepository
      .createQueryBuilder('s')
      .select('COALESCE(MAX(s.id), 0)', 'max')
      .getRawOne<{ max: string }>();
    const nextId = Number(raw?.max ?? 0) + 1;

    return this.storeRepository.save(
      this.storeRepository.create({
        id: nextId,
        outletId,
        isOpen: true,
        message: null,
      }),
    );
  }

  private async findByIdOrSlug(idOrSlug: string) {
    return this.outletRepository.findOne({
      where: [{ id: idOrSlug }, { slug: idOrSlug }],
    });
  }

  private toPublicDto(row: OutletEntity) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      address: row.address,
      isDefault: row.isDefault,
    };
  }

  private toAdminDto(row: OutletEntity) {
    return {
      ...this.toPublicDto(row),
      petpoojaRestId: row.petpoojaRestId,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
