import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product.entity';

/**
 * Guard to verify that the authenticated user is the owner of the product.
 *
 * This guard extracts the product ID from the route parameters (:id),
 * fetches the product from the database, and verifies that the product
 * belongs to the authenticated user.
 *
 * Usage in controllers:
 * @UseGuards(JwtAuthGuard, ProductOwnerGuard)
 *
 * This prevents users from modifying/deleting products belonging to other users.
 */
@Injectable()
export class ProductOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string } | undefined;

    if (!user || !user.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get the product ID from route parameters
    const productId = request.params.id;

    if (!productId) {
      throw new ForbiddenException('Product ID not found in request');
    }

    // Fetch the product to verify ownership
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['user'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if the authenticated user is the owner of the product
    if (product.user.id !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to access this product',
      );
    }

    // Attach the product to the request for use in the controller/service
    request.product = product;

    return true;
  }
}

// Extend Express Request type to include product property
declare global {
  namespace Express {
    interface Request {
      product?: Product;
    }
  }
}
