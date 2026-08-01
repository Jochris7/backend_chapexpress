import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { DeliveryZone } from '../delivery-zones/entities/delivery-zone.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  findAll() {
    return this.orderRepository.find({
      relations: { items: { product: true }, deliveryZone: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: { product: true }, deliveryZone: true },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    return order;
  }

  async create(createOrderDto: CreateOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deliveryZone = await queryRunner.manager.findOne(DeliveryZone, {
        where: { id: createOrderDto.deliveryZoneId },
      });

      if (!deliveryZone) {
        throw new BadRequestException('Zone de livraison introuvable');
      }

      let subtotal = 0;
      const orderItems: OrderItem[] = [];

      for (const item of createOrderDto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product) {
          throw new BadRequestException('Produit introuvable');
        }

        if (product.quantity < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour ${product.title}`,
          );
        }

        subtotal += product.price * item.quantity;

        orderItems.push(
          queryRunner.manager.create(OrderItem, {
            productId: product.id,
            quantity: item.quantity,
            unitPrice: product.price,
            size: item.size ?? null,
          }),
        );

        product.quantity -= item.quantity;
        await queryRunner.manager.save(Product, product);
      }

      const total = subtotal + deliveryZone.fee;

      const order = queryRunner.manager.create(Order, {
        customerName: createOrderDto.customerName,
        phone1: createOrderDto.phone1,
        phone2: createOrderDto.phone2 ?? null,
        city: createOrderDto.city,
        deliveryZoneId: deliveryZone.id,
        district: createOrderDto.district ?? null,
        promoCode: createOrderDto.promoCode ?? null,
        subtotal,
        deliveryFee: deliveryZone.fee,
        total,
        paymentMethod: createOrderDto.paymentMethod,
        status: OrderStatus.PENDING,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      return this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.findOne(id);
    order.status = updateOrderStatusDto.status;
    return this.orderRepository.save(order);
  }
}
