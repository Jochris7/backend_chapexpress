import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { slugify } from '../common/utils/slugify.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  findAll() {
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await this.categoryRepository.findOne({
      where: { name: ILike(createCategoryDto.name) },
    });

    if (existing) {
      throw new ConflictException('Une catégorie avec ce nom existe déjà');
    }

    const category = this.categoryRepository.create({
      name: createCategoryDto.name,
      slug: slugify(createCategoryDto.name),
    });

    return this.categoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const productCount = await this.productRepository.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une catégorie utilisée par des produits',
      );
    }

    await this.categoryRepository.remove(category);
  }
}
