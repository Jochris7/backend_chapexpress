import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeliveryZone } from '../../delivery-zones/entities/delivery-zone.entity';
import { OrderItem } from './order-item.entity';

export enum PaymentMethod {
  WAVE = 'wave',
  CASH_ON_DELIVERY = 'cash_on_delivery',
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column()
  phone1: string;

  @Column({ type: 'varchar', nullable: true })
  phone2: string | null;

  @Column()
  city: string;

  @Column()
  deliveryZoneId: string;

  @ManyToOne(() => DeliveryZone, (deliveryZone) => deliveryZone.orders)
  @JoinColumn({ name: 'deliveryZoneId' })
  deliveryZone: DeliveryZone;

  @Column({ type: 'varchar', nullable: true })
  district: string | null;

  @Column({ type: 'varchar', nullable: true })
  promoCode: string | null;

  @Column('int')
  subtotal: number;

  @Column('int')
  deliveryFee: number;

  @Column('int')
  total: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
  })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}
