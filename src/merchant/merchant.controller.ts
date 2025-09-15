import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('merchant')
@ApiBearerAuth()
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Register a new merchant' })
  @ApiResponse({ status: 201, description: 'Merchant registered successfully.' })
  async create(@Body() dto: CreateMerchantDto) {
    return this.merchantService.create(dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get merchant by ID' })
  @ApiResponse({ status: 200, description: 'Merchant found.' })
  async findById(@Param('id') id: string) {
    return this.merchantService.findById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update merchant' })
  @ApiResponse({ status: 200, description: 'Merchant updated.' })
  async update(@Param('id') id: string, @Body() dto: UpdateMerchantDto) {
    return this.merchantService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete merchant' })
  @ApiResponse({ status: 200, description: 'Merchant deleted.' })
  async remove(@Param('id') id: string) {
    await this.merchantService.remove(id);
    return { message: 'Merchant deleted successfully.' };
  }
}