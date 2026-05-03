import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductEbookService } from './product-ebook.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';

// A tipagem do usuário injetada pelo JwtAuthGuard
interface RequestWithUser extends Request {
  user: any; // Using any or specific Passport user type to avoid conflicts
}

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products/:productId/ebook')
export class ProductEbookController {
  constructor(private readonly productEbookService: ProductEbookService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED) // 202
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an E-book PDF for AI ingestion' })
  @ApiConsumes('multipart/form-data')
  async uploadEbook(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() req: RequestWithUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB limit
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // JWT strategy returns userId
    const sellerId = req.user.userId;
    return this.productEbookService.handleEbookUpload(productId, sellerId, file);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get the status of the latest E-book ingestion job' })
  async getStatus(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() req: RequestWithUser,
  ) {
    const sellerId = req.user.userId;
    return this.productEbookService.getIngestionStatus(productId, sellerId);
  }
}
