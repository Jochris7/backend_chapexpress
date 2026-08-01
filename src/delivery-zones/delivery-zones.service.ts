import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

const SEED_ZONES: CreateDeliveryZoneDto[] = [
  { name: 'Yopougon', city: 'Abidjan', fee: 1000 },
  { name: 'Cocody', city: 'Abidjan', fee: 1500 },
  { name: 'Marcory', city: 'Abidjan', fee: 1500 },
  { name: 'Abobo', city: 'Abidjan', fee: 1500 },
  { name: 'Anyama', city: 'Abidjan', fee: 2000 },
  { name: 'Attécoubé', city: 'Abidjan', fee: 1500 },
  { name: 'Koumassi', city: 'Abidjan', fee: 1500 },
  { name: 'Plateau', city: 'Abidjan', fee: 1500 },
  { name: 'Port-Bouet', city: 'Abidjan', fee: 2000 },
  { name: 'Treichville', city: 'Abidjan', fee: 1500 },
  { name: 'Expédition', city: 'Abidjan', fee: 2500 },
];

@Injectable()
export class DeliveryZonesService {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly deliveryZoneRepository: Repository<DeliveryZone>,
  ) {}

  findAll() {
    return this.deliveryZoneRepository.find({ order: { name: 'ASC' } });
  }

  create(createDeliveryZoneDto: CreateDeliveryZoneDto) {
    const zone = this.deliveryZoneRepository.create(createDeliveryZoneDto);
    return this.deliveryZoneRepository.save(zone);
  }

  async update(id: string, updateDeliveryZoneDto: UpdateDeliveryZoneDto) {
    await this.findOne(id);
    await this.deliveryZoneRepository.update(id, updateDeliveryZoneDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const zone = await this.findOne(id);
    await this.deliveryZoneRepository.remove(zone);
  }

  async seed() {
    const existingCount = await this.deliveryZoneRepository.count();

    if (existingCount > 0) {
      return { seeded: false, count: existingCount };
    }

    const zones = this.deliveryZoneRepository.create(SEED_ZONES);
    const saved = await this.deliveryZoneRepository.save(zones);

    return { seeded: true, count: saved.length };
  }

  private async findOne(id: string) {
    const zone = await this.deliveryZoneRepository.findOne({ where: { id } });

    if (!zone) {
      throw new NotFoundException('Zone de livraison introuvable');
    }

    return zone;
  }
}
