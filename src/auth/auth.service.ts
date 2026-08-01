import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin } from './entities/admin.entity';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const admin = await this.adminRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload = { sub: admin.id, email: admin.email };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async seedAdmin(createAdminDto: CreateAdminDto) {
    const adminCount = await this.adminRepository.count();

    if (adminCount > 0) {
      throw new ConflictException('Un compte admin existe déjà');
    }

    const passwordHash = await bcrypt.hash(createAdminDto.password, 10);

    const admin = await this.adminRepository.save(
      this.adminRepository.create({
        email: createAdminDto.email,
        passwordHash,
      }),
    );

    return {
      id: admin.id,
      email: admin.email,
      createdAt: admin.createdAt,
    };
  }
}
