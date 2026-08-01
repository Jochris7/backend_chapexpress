import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, MoreThan, Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { PRODUCT_IMAGES_DIR } from '../common/constants/paths.constant';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  findAll(query: FindProductsQueryDto) {
    const where: FindOptionsWhere<Product> = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.title = ILike(`%${query.search}%`);
    }

    if (query.includeOutOfStock !== 'true') {
      where.quantity = MoreThan(0);
    }

    return this.productRepository.find({
      where,
      relations: { category: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async create(
    createProductDto: CreateProductDto,
    image?: Express.Multer.File,
  ) {
    if (!image) {
      throw new BadRequestException('Une image est requise');
    }

    try {
      await this.ensureCategoryExists(createProductDto.categoryId);
    } catch (error) {
      await this.deleteImageFile(`/uploads/products/${image.filename}`);
      throw error;
    }

    const product = await this.productRepository.save(
      this.productRepository.create({
        ...createProductDto,
        imageUrl: `/uploads/products/${image.filename}`,
      }),
    );

    return this.findOne(product.id);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    image?: Express.Multer.File,
  ) {
    const product = await this.findOne(id);

    if (updateProductDto.categoryId) {
      try {
        await this.ensureCategoryExists(updateProductDto.categoryId);
      } catch (error) {
        if (image) {
          await this.deleteImageFile(`/uploads/products/${image.filename}`);
        }
        throw error;
      }
    }

    if (image) {
      await this.deleteImageFile(product.imageUrl);
    }

    await this.productRepository.update(id, {
      ...updateProductDto,
      ...(image ? { imageUrl: `/uploads/products/${image.filename}` } : {}),
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.deleteImageFile(product.imageUrl);
    await this.productRepository.remove(product);
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException('Catégorie introuvable');
    }
  }

  private async deleteImageFile(imageUrl: string) {
    const fileName = imageUrl.split('/').pop();

    if (!fileName) {
      return;
    }

    try {
      await unlink(join(PRODUCT_IMAGES_DIR, fileName));
    } catch {
      return;
    }
  }
}
