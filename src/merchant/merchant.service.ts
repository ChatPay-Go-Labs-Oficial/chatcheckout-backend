import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './merchant.entity';
import { User } from '../user/user.entity';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@Injectable()
export class MerchantService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateMerchantDto): Promise<Merchant> {
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    const merchant = this.merchantRepository.create({
      user,
      merchant_id: dto.merchant_id,
      display_name: dto.display_name,
      logo_url: dto.logo_url,
    });
    return this.merchantRepository.save(merchant);
  }

  async findById(id: string): Promise<Merchant> {
    const merchant = await this.merchantRepository.findOne({ where: { id }, relations: ['user'] });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async update(id: string, dto: UpdateMerchantDto): Promise<Merchant> {
    const merchant = await this.findById(id);
    Object.assign(merchant, dto);
    return this.merchantRepository.save(merchant);
  }

  async remove(id: string): Promise<void> {
    const merchant = await this.findById(id);
    await this.merchantRepository.remove(merchant);
  }
}