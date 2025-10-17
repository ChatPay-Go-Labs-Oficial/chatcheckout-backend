import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { UserBusinessValidator } from './user-business.validator';
import { User } from '../user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserRole } from '../user-role.enum';

describe('UserBusinessValidator', () => {
  let validator: UserBusinessValidator;
  let userRepository: Repository<User>;

  const validUserDto: CreateUserDto = {
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao@exemplo.com',
    cpf: '12345678901',
    password: 'MinhaSenh@123',
    confirmPassword: 'MinhaSenh@123',
    role: UserRole.Infoproducer,
  };

  const mockRepository = () => ({
    findOne: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserBusinessValidator,
        {
          provide: getRepositoryToken(User),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    validator = module.get<UserBusinessValidator>(UserBusinessValidator);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateForCreation', () => {
    it('deve validar com sucesso um DTO válido', async () => {
      // Mock: nenhum usuário encontrado (não há duplicatas)
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(validator.validateForCreation(validUserDto)).resolves.not.toThrow();
    });

    it('deve lançar erro para email duplicado', async () => {
      // Mock: usuário com email já existe
      const existingUser = { id: 1, email: validUserDto.email };
      (userRepository.findOne as jest.Mock).mockResolvedValue(existingUser);

      await expect(validator.validateForCreation(validUserDto)).rejects.toThrow(ConflictException);
    });

    it('deve lançar erro para CPF duplicado', async () => {
      // Mock: primeira chamada (email) null, segunda (CPF) encontra usuário
      (userRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, cpf: validUserDto.cpf });

      await expect(validator.validateForCreation(validUserDto)).rejects.toThrow(ConflictException);
    });

    it('deve validar CNPJ quando fornecido', async () => {
      const userWithCnpj: CreateUserDto = {
        ...validUserDto,
        companyName: 'Empresa Teste LTDA',
        cnpj: '12345678000195',
      };

      // Mock: nenhum usuário encontrado
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(validator.validateForCreation(userWithCnpj)).resolves.not.toThrow();
    });

    it('deve lançar erro para CNPJ duplicado', async () => {
      const userWithCnpj: CreateUserDto = {
        ...validUserDto,
        companyName: 'Empresa Teste LTDA',
        cnpj: '12345678000195',
      };

      // Mock: primeiras duas chamadas null, terceira encontra CNPJ duplicado
      (userRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, cnpj: userWithCnpj.cnpj });

      await expect(validator.validateForCreation(userWithCnpj)).rejects.toThrow(ConflictException);
    });
  });

  describe('validateBusinessRules', () => {
    it('deve validar regras básicas com sucesso', () => {
      expect(() => validator.validateBusinessRules(validUserDto)).not.toThrow();
    });

    it('deve lançar erro se CNPJ fornecido sem nome da empresa', () => {
      const invalidDto: CreateUserDto = {
        ...validUserDto,
        cnpj: '12345678000195',
        // companyName não fornecido
      };

      expect(() => validator.validateBusinessRules(invalidDto)).toThrow(BadRequestException);
    });

    it('deve validar quando nome da empresa fornecido sem CNPJ', () => {
      const validDtoWithCompany: CreateUserDto = {
        ...validUserDto,
        companyName: 'Empresa Teste LTDA',
        // cnpj não fornecido - deve ser válido
      };

      expect(() => validator.validateBusinessRules(validDtoWithCompany)).not.toThrow();
    });

    it('deve validar quando ambos nome da empresa e CNPJ são fornecidos', () => {
      const validDtoWithBoth: CreateUserDto = {
        ...validUserDto,
        companyName: 'Empresa Teste LTDA',
        cnpj: '12345678000195',
      };

      expect(() => validator.validateBusinessRules(validDtoWithBoth)).not.toThrow();
    });
  });

  describe('checkDuplicates', () => {
    it('deve verificar duplicatas de email', async () => {
      const existingUser = { id: 1, email: validUserDto.email };
      (userRepository.findOne as jest.Mock).mockResolvedValue(existingUser);

      await expect(validator.checkDuplicates(validUserDto)).rejects.toThrow(ConflictException);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: validUserDto.email },
      });
    });

    it('deve verificar duplicatas de CPF', async () => {
      // Primeira chamada (email) retorna null, segunda chamada (CPF) retorna usuário
      (userRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, cpf: validUserDto.cpf });

      await expect(validator.checkDuplicates(validUserDto)).rejects.toThrow(ConflictException);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { cpf: validUserDto.cpf },
      });
    });

    it('deve verificar duplicatas de CNPJ quando fornecido', async () => {
      const userWithCnpj: CreateUserDto = {
        ...validUserDto,
        companyName: 'Empresa Teste LTDA',
        cnpj: '12345678000195',
      };

      // Primeiras duas chamadas (email e CPF) retornam null, terceira (CNPJ) retorna usuário
      (userRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, cnpj: userWithCnpj.cnpj });

      await expect(validator.checkDuplicates(userWithCnpj)).rejects.toThrow(ConflictException);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { cnpj: userWithCnpj.cnpj },
      });
    });

    it('deve passar quando não há duplicatas', async () => {
      // Todas as verificações retornam null (nenhum usuário encontrado)
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(validator.checkDuplicates(validUserDto)).resolves.not.toThrow();
    });
  });

  describe('integração - validateForCreation', () => {
    it('deve chamar todas as validações na ordem correta', async () => {
      const validateBusinessRulesSpy = jest.spyOn(validator, 'validateBusinessRules');
      const checkDuplicatesSpy = jest.spyOn(validator, 'checkDuplicates');

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await validator.validateForCreation(validUserDto);

      expect(validateBusinessRulesSpy).toHaveBeenCalledWith(validUserDto);
      expect(checkDuplicatesSpy).toHaveBeenCalledWith(validUserDto);
    });

    it('deve interromper validação se regras de negócio falharem', async () => {
      const invalidDto: CreateUserDto = {
        ...validUserDto,
        cnpj: '12345678000195',
        // companyName não fornecido
      };

      const checkDuplicatesSpy = jest.spyOn(validator, 'checkDuplicates');

      await expect(validator.validateForCreation(invalidDto)).rejects.toThrow(BadRequestException);

      // checkDuplicates não deve ser chamado se validateBusinessRules falhar
      expect(checkDuplicatesSpy).not.toHaveBeenCalled();
    });
  });
});
