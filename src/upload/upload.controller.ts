import { Controller, Post, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { MultiFileValidationPipe } from 'src/upload/pipes/multi-file-validation.pipe';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFiles(new MultiFileValidationPipe())
    file: Express.Multer.File,
  ) {
    const url = await this.uploadService.uploadFile(file);
    return { url };
  }
}
