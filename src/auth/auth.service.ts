import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Merchant } from './merchant.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(dto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      password_hash: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async registerMerchant(dto: CreateMerchantDto): Promise<Merchant> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) throw new Error('User not found');
    const merchant = this.merchantRepository.create({
      user,
      display_name: dto.display_name,
      description: dto.description,
      logo_url: dto.logo_url,
    });
    return this.merchantRepository.save(merchant);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new Error('User not found');
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new Error('Invalid password');
    return user;
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.validateUser(dto.email, dto.password);
    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
