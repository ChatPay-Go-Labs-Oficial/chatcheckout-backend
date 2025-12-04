import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UserBusinessValidator {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Valida todas as regras de negócio para criação de usuário
   */
  async validateForCreation(dto: CreateUserDto): Promise<void> {
    this.validateBusinessRules(dto);
    await this.checkDuplicates(dto);
  }

  /**
   * Valida regras de negócio específicas
   */
  validateBusinessRules(dto: CreateUserDto): void {
    // Verificar se senhas coincidem
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }
  }

  /**
   * Verifica duplicidade de dados únicos
   */
  async checkDuplicates(dto: CreateUserDto): Promise<void> {
    // Verificar duplicidade de email
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUserByEmail) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    // Verificar duplicidade de CPF
    const existingUserByCpf = await this.userRepository.findOne({
      where: { cpf: dto.cpf },
    });
    if (existingUserByCpf) {
      throw new ConflictException('Este CPF já está cadastrado');
    }

    // Verificar se CNPJ é único (se fornecido)
    if (dto.cnpj) {
      const existingUserByCnpj = await this.userRepository.findOne({
        where: { cnpj: dto.cnpj },
      });
      if (existingUserByCnpj) {
        throw new ConflictException('Este CNPJ já está cadastrado');
      }
    }
  }
}
