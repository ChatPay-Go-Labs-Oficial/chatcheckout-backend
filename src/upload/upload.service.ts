import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

    // Validação de configuração
    const requiredVars = [
      { name: 'R2_ACCOUNT_ID', value: accountId },
      { name: 'R2_ACCESS_KEY_ID', value: accessKeyId },
      { name: 'R2_SECRET_ACCESS_KEY', value: secretAccessKey },
      { name: 'R2_BUCKET_NAME', value: this.bucketName },
      { name: 'R2_PUBLIC_URL', value: this.publicUrl },
    ];

    requiredVars.forEach(({ name, value }) => {
      if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
      }
    });

    // Endpoint do Cloudflare R2
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      const fileName = `${randomUUID()}-${file.originalname}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      return `${this.publicUrl}/${fileName}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file to R2: ${(error as Error).message}`,
      );
    }
  }

  async uploadFileWithKey(file: Express.Multer.File, key: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      return `${this.publicUrl}/${key}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file to R2 with specific key: ${(error as Error).message}`,
      );
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract Key from URL
      // URL format: https://<public_url>/<key>
      const urlParts = fileUrl.split('/');
      const key = urlParts[urlParts.length - 1];

      if (!key) return;

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error(`Failed to delete file ${fileUrl}:`, error);
      // We do not throw here to avoid blocking the update process
    }
  }
}
