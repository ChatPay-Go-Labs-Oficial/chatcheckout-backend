import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserBusinessValidator } from './validators/user-business.validator';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userBusinessValidator: UserBusinessValidator,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    await this.userBusinessValidator.validateForCreation(dto);

    const password_hash = await bcrypt.hash(dto.password, 10);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, password, ...userDataWithoutPassword } = dto;
    const user = this.userRepository.create({
      ...userDataWithoutPassword,
      password_hash,
    });

    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    const { password, ...rest } = dto;
    Object.assign(user, rest);
    if (password) {
      user.password_hash = await bcrypt.hash(password, 10);
    }

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
