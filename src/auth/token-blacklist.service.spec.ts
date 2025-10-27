import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from './token-blacklist.service';
import { RedisService } from '../config/redis.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let redisService: jest.Mocked<RedisService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockRedisService = {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockJwtService = {
    decode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    redisService = module.get(RedisService);
    jwtService = module.get(JwtService);

    // Limpa mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToBlacklist', () => {
    const mockToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNjIzMjA3NjAwfQ.signature';

    it('should add token to blacklist with calculated TTL from JWT', async () => {
      const mockDecoded = {
        sub: '123',
        name: 'John Doe',
        exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
      };

      jwtService.decode.mockReturnValue(mockDecoded);

      await service.addToBlacklist(mockToken);

      expect(jwtService.decode).toHaveBeenCalledWith(mockToken);
      expect(redisService.setex).toHaveBeenCalledWith(
        `blacklist:${mockToken}`,
        expect.any(Number), // TTL should be close to 3600
        'revoked',
      );

      const ttlUsed = (redisService.setex as jest.Mock).mock.calls[0][1];
      expect(ttlUsed).toBeGreaterThan(3500);
      expect(ttlUsed).toBeLessThanOrEqual(3600);
    });

    it('should add token to blacklist with provided TTL', async () => {
      const customTtl = 7200; // 2 hours

      await service.addToBlacklist(mockToken, customTtl);

      expect(jwtService.decode).not.toHaveBeenCalled();
      expect(redisService.setex).toHaveBeenCalledWith(
        `blacklist:${mockToken}`,
        customTtl,
        'revoked',
      );
    });

    it('should use default TTL (7 days) when token decode fails', async () => {
      jwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await service.addToBlacklist(mockToken);

      expect(redisService.setex).toHaveBeenCalledWith(
        `blacklist:${mockToken}`,
        60 * 60 * 24 * 7, // 7 days
        'revoked',
      );
    });

    it('should use default TTL (7 days) when token is already expired', async () => {
      const expiredDecoded = {
        sub: '123',
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
      };

      jwtService.decode.mockReturnValue(expiredDecoded);

      await service.addToBlacklist(mockToken);

      expect(redisService.setex).toHaveBeenCalledWith(
        `blacklist:${mockToken}`,
        60 * 60 * 24 * 7, // 7 days (fallback)
        'revoked',
      );
    });

    it('should use default TTL when decoded token has no exp field', async () => {
      jwtService.decode.mockReturnValue({ sub: '123', name: 'John' });

      await service.addToBlacklist(mockToken);

      expect(redisService.setex).toHaveBeenCalledWith(
        `blacklist:${mockToken}`,
        60 * 60 * 24 * 7,
        'revoked',
      );
    });
  });

  describe('isBlacklisted', () => {
    const mockToken = 'some.jwt.token';

    it('should return true when token is in blacklist', async () => {
      redisService.get.mockResolvedValue('revoked');

      const result = await service.isBlacklisted(mockToken);

      expect(redisService.get).toHaveBeenCalledWith(`blacklist:${mockToken}`);
      expect(result).toBe(true);
    });

    it('should return false when token is not in blacklist', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.isBlacklisted(mockToken);

      expect(redisService.get).toHaveBeenCalledWith(`blacklist:${mockToken}`);
      expect(result).toBe(false);
    });

    it('should return false when Redis returns unexpected value', async () => {
      redisService.get.mockResolvedValue('something-else');

      const result = await service.isBlacklisted(mockToken);

      expect(result).toBe(false);
    });
  });

  describe('removeFromBlacklist', () => {
    const mockToken = 'some.jwt.token';

    it('should remove token from blacklist', async () => {
      redisService.del.mockResolvedValue(1);

      await service.removeFromBlacklist(mockToken);

      expect(redisService.del).toHaveBeenCalledWith(`blacklist:${mockToken}`);
    });

    it('should handle removal of non-existent token', async () => {
      redisService.del.mockResolvedValue(0);

      await service.removeFromBlacklist(mockToken);

      expect(redisService.del).toHaveBeenCalledWith(`blacklist:${mockToken}`);
    });
  });
});
