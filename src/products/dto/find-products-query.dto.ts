import { IsBooleanString, IsOptional, IsString, IsUUID } from 'class-validator';

export class FindProductsQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  includeOutOfStock?: string;
}
