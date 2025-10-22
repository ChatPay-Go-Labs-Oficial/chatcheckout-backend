import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../user/user.entity';
import { TokenBlacklistService } from './token-blacklist.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserRole } from '../user/user-role.enum';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password_hash: '$2b$10$hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    cpf: '12345678909',
    role: UserRole.Infoproducer,
    companyName: undefined,
    cnpj: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRATION: '1h',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return config[key];
    }),
  };

  const mockTokenBlacklistService = {
    addToBlacklist: jest.fn(),
    isBlacklisted: jest.fn(),
    removeFromBlacklist: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    tokenBlacklistService = module.get(TokenBlacklistService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const identifier = 'test@example.com';
      const password = 'ValidPassword123';

      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(identifier, password);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: identifier },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password_hash);
      expect(result).toBeDefined();
      expect(result.email).toBe(identifier);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      identifier: 'test@example.com',
      password: 'ValidPassword123',
    };

    it('should return access token, refresh token and user data', async () => {
      const mockTokens = {
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        },
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should support login with CPF', async () => {
      const cpfLoginDto: LoginDto = {
        identifier: '123.456.789-09',
        password: 'ValidPassword123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValueOnce('access.token').mockReturnValueOnce('refresh.token');

      const result = await service.login(cpfLoginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid.refresh.token',
    };

    it('should return new access token for valid refresh token', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        role: mockUser.role,
      });
      userRepository.findOne.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValueOnce('new.access.token');

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toEqual({
        access_token: 'new.access.token',
      });
    });

    it('should throw UnauthorizedException for blacklisted token', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(true);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should add token to blacklist and return success', async () => {
      tokenBlacklistService.addToBlacklist.mockResolvedValue();

      const result = await service.logout({ token: 'valid.token' });

      expect(result).toEqual({
        message: 'Logout realizado com sucesso',
      });
    });

    it('should return success even if blacklist fails', async () => {
      tokenBlacklistService.addToBlacklist.mockRejectedValue(new Error('Redis error'));

      const result = await service.logout({ token: 'valid.token' });

      expect(result).toEqual({
        message: 'Logout realizado com sucesso',
      });
    });
  });
});
