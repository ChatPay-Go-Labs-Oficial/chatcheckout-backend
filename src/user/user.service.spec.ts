import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserBusinessValidator } from './validators/user-business.validator';
import { UserRole } from './user-role.enum';
import * as bcrypt from 'bcrypt';

// Mock do bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let userBusinessValidator: UserBusinessValidator;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao@exemplo.com',
    cpf: '12345678901',
    password_hash: 'hashedPassword',
    role: UserRole.Infoproducer,
    companyName: undefined,
    cnpj: undefined,
    stripeOnboardingCompleted: false,
    cryptoWalletAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateUserDto: CreateUserDto = {
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao@exemplo.com',
    cpf: '12345678901',
    password: 'MinhaSenh@123',
    confirmPassword: 'MinhaSenh@123',
    role: UserRole.Infoproducer,
  };

  const mockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  });

  const mockValidator = () => ({
    validateForCreation: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useFactory: mockRepository,
        },
        {
          provide: UserBusinessValidator,
          useFactory: mockValidator,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userBusinessValidator = module.get<UserBusinessValidator>(UserBusinessValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um usuário com sucesso', async () => {
      // Arrange
      const hashedPassword = 'hashedPassword123';
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      (userBusinessValidator.validateForCreation as jest.Mock).mockResolvedValue(undefined);
      (userRepository.create as jest.Mock).mockReturnValue(mockUser);
      (userRepository.save as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.create(mockCreateUserDto);

      // Assert
      expect(userBusinessValidator.validateForCreation).toHaveBeenCalledWith(mockCreateUserDto);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockCreateUserDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        firstName: mockCreateUserDto.firstName,
        lastName: mockCreateUserDto.lastName,
        email: mockCreateUserDto.email,
        cpf: mockCreateUserDto.cpf,
        role: mockCreateUserDto.role,
        password_hash: hashedPassword,
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toBe(mockUser);
    });

    it('deve criar usuário com dados da empresa quando fornecidos', async () => {
      // Arrange
      const dtoWithCompany: CreateUserDto = {
        ...mockCreateUserDto,
        companyName: 'Empresa Teste LTDA',
        cnpj: '12345678000195',
      };
      const hashedPassword = 'hashedPassword123';

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      (userBusinessValidator.validateForCreation as jest.Mock).mockResolvedValue(undefined);
      (userRepository.create as jest.Mock).mockReturnValue(mockUser);
      (userRepository.save as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.create(dtoWithCompany);

      // Assert
      expect(userRepository.create).toHaveBeenCalledWith({
        firstName: dtoWithCompany.firstName,
        lastName: dtoWithCompany.lastName,
        email: dtoWithCompany.email,
        cpf: dtoWithCompany.cpf,
        role: dtoWithCompany.role,
        companyName: dtoWithCompany.companyName,
        cnpj: dtoWithCompany.cnpj,
        password_hash: hashedPassword,
      });
      expect(result).toBe(mockUser);
    });

    it('deve propagar erro de validação', async () => {
      // Arrange
      const validationError = new Error('Erro de validação');
      (userBusinessValidator.validateForCreation as jest.Mock).mockRejectedValue(validationError);

      // Act & Assert
      await expect(service.create(mockCreateUserDto)).rejects.toThrow(validationError);
      expect(userBusinessValidator.validateForCreation).toHaveBeenCalledWith(mockCreateUserDto);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('deve retornar usuário quando encontrado', async () => {
      // Arrange
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.findById(mockUser.id);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(result).toBe(mockUser);
    });

    it('deve lançar NotFoundException quando usuário não encontrado', async () => {
      // Arrange
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('invalid-id')).rejects.toThrow('User not found');
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'invalid-id' } });
    });
  });

  describe('update', () => {
    it('deve atualizar usuário com sucesso', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        firstName: 'João Atualizado',
        lastName: 'Silva Atualizado',
      };
      const updatedUser = { ...mockUser, ...updateDto };

      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(mockUser.id, updateDto);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(userRepository.save).toHaveBeenCalledWith({ ...mockUser, ...updateDto });
      expect(result).toBe(updatedUser);
    });

    it('deve lançar NotFoundException se usuário não existir', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        firstName: 'João Atualizado',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'invalid-id' } });
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve remover usuário com sucesso', async () => {
      // Arrange
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.remove as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await service.remove(mockUser.id);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('deve lançar NotFoundException se usuário não existir', async () => {
      // Arrange
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'invalid-id' } });
      expect(userRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('upsertCryptoWallet', () => {
    it('deve salvar carteira crypto para infoproducer', async () => {
      const walletAddress = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
      const userWithWallet = { ...mockUser, cryptoWalletAddress: walletAddress };

      (userRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockUser) // findById
        .mockResolvedValueOnce(null); // duplicate wallet check
      (userRepository.save as jest.Mock).mockResolvedValue(userWithWallet);

      const result = await service.upsertCryptoWallet(mockUser.id, walletAddress.toLowerCase());

      expect(userRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { cryptoWalletAddress: walletAddress },
      });
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        cryptoWalletAddress: walletAddress,
      });
      expect(result).toEqual(userWithWallet);
    });

    it('deve lançar ForbiddenException para usuário client', async () => {
      const clientUser = { ...mockUser, role: UserRole.Client };

      (userRepository.findOne as jest.Mock).mockResolvedValue(clientUser);

      await expect(
        service.upsertCryptoWallet(
          clientUser.id,
          'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar ConflictException se carteira já pertence a outro usuário', async () => {
      const walletAddress = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
      const otherUser = { ...mockUser, id: 'other-user-id', cryptoWalletAddress: walletAddress };

      (userRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockUser) // findById
        .mockResolvedValueOnce(otherUser); // duplicate wallet check

      await expect(service.upsertCryptoWallet(mockUser.id, walletAddress)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('removeCryptoWallet', () => {
    it('deve remover carteira crypto com sucesso', async () => {
      const userWithWallet = {
        ...mockUser,
        cryptoWalletAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      };
      const userWithoutWallet = { ...mockUser, cryptoWalletAddress: null };

      (userRepository.findOne as jest.Mock).mockResolvedValue(userWithWallet);
      (userRepository.save as jest.Mock).mockResolvedValue(userWithoutWallet);

      await service.removeCryptoWallet(mockUser.id);

      expect(userRepository.save).toHaveBeenCalledWith(userWithoutWallet);
    });

    it('deve lançar ForbiddenException para usuário client', async () => {
      const clientUser = { ...mockUser, role: UserRole.Client };

      (userRepository.findOne as jest.Mock).mockResolvedValue(clientUser);

      await expect(service.removeCryptoWallet(clientUser.id)).rejects.toThrow(ForbiddenException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});
