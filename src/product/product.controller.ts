import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Param,
  Put,
  Delete,
  Req,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDecodeResponseDto } from './dto/product-decode-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('product')
@ApiBearerAuth()
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'productFile', maxCount: 1 },
      { name: 'productImage', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Produto Exemplo' },
        price: { type: 'number', example: 99.9 },
        currency: { type: 'string', enum: ['BRL', 'XLM', 'USDC'] },
        description: { type: 'string', example: 'Descrição do produto' },
        promptAi: { type: 'string', example: 'Gere texto de venda' },
        salesPageUrl: { type: 'string', example: 'https://meusite.com/produto' },
        productFile: { type: 'string', format: 'binary' },
        productImage: { type: 'string', format: 'binary' },
      },
    },
  })
  async create(
    @Req() req: Request,
    @Body() dto: CreateProductDto,
    @UploadedFiles()
    files: { productFile?: Express.Multer.File[]; productImage?: Express.Multer.File[] },
  ) {
    const userId = (req.user as { userId: string }).userId;

    // Extrair os arquivos do objeto files
    const productFile = files.productFile?.[0];
    const productImage = files.productImage?.[0];

    return this.productService.create(userId, dto, productFile, productImage);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all products' })
  @ApiResponse({ status: 200, description: 'List of products.' })
  async findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.productService.findAll(page, limit);
  }

  /**
   * Public endpoint for checkout flow.
   * Intentionally unauthenticated to allow customers to view product details via hash.
   * Only returns non-sensitive seller information (no email or private data).
   * The product hash serves as the authorization mechanism.
   */
  @Get('by-hash/:hash')
  @ApiOperation({
    summary: 'Get product by hash and seller info',
    description:
      'Public endpoint - returns product details and limited seller info (excludes sensitive data like email)',
  })
  @ApiResponse({
    status: 200,
    description: 'Product info decoded with non-sensitive seller data.',
    type: ProductDecodeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 400, description: 'Invalid hash.' })
  async getProductByHash(@Param('hash') hash: string) {
    return this.productService.getProductByHash(hash);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product found.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findById(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List products by user' })
  @ApiResponse({ status: 200, description: 'List of user products.' })
  async findByUser(@Param('userId') userId: string) {
    return this.productService.findByUser(userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async update(@Param('id') id: string, @Req() req: Request, @Body() dto: UpdateProductDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.productService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 200, description: 'Product deleted.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    await this.productService.remove(id, userId);
    return { message: 'Product deleted successfully.' };
  }
}
