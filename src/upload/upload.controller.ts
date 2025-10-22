import { Controller, Post, UseInterceptors, UploadedFiles, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { MultiFileValidationPipe } from 'src/upload/pipes/multi-file-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload de arquivo PDF' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFiles(new MultiFileValidationPipe())
    file: Express.Multer.File,
  ) {
    const url = await this.uploadService.uploadFile(file);
    return { url };
  }
}
