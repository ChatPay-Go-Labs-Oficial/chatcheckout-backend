import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceOwnerGuard } from '../common/guards/resource-owner.guard';
import type { Request } from 'express';
import { UpsertUserWalletDto } from './dto/upsert-user-wallet.dto';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully.' })
  async register(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile.' })
  getProfile(@Req() req: Request) {
    if (!req.user || !('userId' in req.user)) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.userService.findById((req.user as { userId: string }).userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ResourceOwnerGuard)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only update your own account.' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Put('wallet')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create or update authenticated seller wallet address' })
  @ApiResponse({ status: 200, description: 'Wallet address saved.' })
  @ApiResponse({ status: 403, description: 'Only infoproducers can manage wallet address.' })
  async upsertWallet(@Req() req: Request, @Body() dto: UpsertUserWalletDto) {
    const userId = this.extractUserId(req);
    return this.userService.upsertCryptoWallet(userId, dto.walletAddress);
  }

  @Delete('wallet')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove authenticated seller wallet address' })
  @ApiResponse({ status: 204, description: 'Wallet address removed.' })
  @ApiResponse({ status: 403, description: 'Only infoproducers can manage wallet address.' })
  async removeWallet(@Req() req: Request): Promise<void> {
    const userId = this.extractUserId(req);
    await this.userService.removeCryptoWallet(userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ResourceOwnerGuard)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only delete your own account.' })
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return { message: 'User deleted successfully.' };
  }

  private extractUserId(req: Request): string {
    if (!req.user || !('userId' in req.user)) {
      throw new UnauthorizedException('User not authenticated');
    }

    return (req.user as { userId: string }).userId;
  }
}
