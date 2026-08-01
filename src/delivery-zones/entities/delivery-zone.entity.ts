import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('delivery_zones')
export class DeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  city: string;

  @Column('int')
  fee: number;

  @OneToMany(() => Order, (order) => order.deliveryZone)
  orders: Order[];
}
