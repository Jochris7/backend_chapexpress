import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateDeliveryZoneDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsInt()
  @Min(0)
  fee: number;
}
