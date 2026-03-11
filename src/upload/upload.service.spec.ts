import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('UploadService', () => {
  let service: UploadService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        R2_ACCOUNT_ID: 'test-account',
        R2_ACCESS_KEY_ID: 'test-key',
        R2_SECRET_ACCESS_KEY: 'test-secret',
        R2_BUCKET_NAME: 'test-bucket',
        R2_PUBLIC_URL: 'https://test.r2.dev',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file and return public URL', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 1024,
        destination: '',
        filename: '',
        path: '',
        stream: null,
      };

      // Mock do S3Client.send
      jest.spyOn(service['s3Client'], 'send').mockResolvedValue({} as any);

      const result = await service.uploadFile(mockFile);

      expect(result).toContain('https://test.r2.dev/');
      expect(result).toContain('test.pdf');
    });

    it('should throw InternalServerErrorException on upload failure', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 1024,
        destination: '',
        filename: '',
        path: '',
        stream: null,
      };

      // Mock S3Client.send to throw error
      jest.spyOn(service['s3Client'], 'send').mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFile(mockFile)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('constructor validation', () => {
    it('should throw error if required env vars are missing', () => {
      const invalidConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new UploadService(invalidConfigService as any);
      }).toThrow('Missing required environment variable');
    });
  });
});
