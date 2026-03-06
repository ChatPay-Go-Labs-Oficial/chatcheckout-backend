import { Controller, Post, UseInterceptors, UploadedFiles, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { MultiFileValidationPipe } from 'src/upload/pipes/multi-file-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload de arquivo PDF' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo PDF/JPG/JPEG/PNG para upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Arquivo enviado com sucesso.',
    schema: { example: { url: 'https://cdn.exemplo.com/uploads/arquivo.pdf' } },
  })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou ausente.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFiles(new MultiFileValidationPipe())
    file: Express.Multer.File,
  ) {
    const url = await this.uploadService.uploadFile(file);
    return { url };
  }
}
