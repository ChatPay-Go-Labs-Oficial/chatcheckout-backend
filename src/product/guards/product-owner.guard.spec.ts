import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { ProductOwnerGuard } from './product-owner.guard';
import { Product } from '../product.entity';
import { User } from '../../user/user.entity';

describe('ProductOwnerGuard', () => {
  let guard: ProductOwnerGuard;
  let reflector: Reflector;
  let productRepository: Repository<Product>;

  // Mock user and product
  const mockUser: User = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password_hash: 'hash',
  } as User;

  const mockProduct: Product = {
    id: 'product-123',
    name: 'Test Product',
    price: 99.99,
    currency: 'BRL',
    user: mockUser,
  } as Product;

  const mockOtherProduct: Product = {
    id: 'product-456',
    name: 'Other Product',
    price: 149.99,
    currency: 'BRL',
    user: { ...mockUser, id: 'user-456' },
  } as Product;

  beforeEach(() => {
    reflector = new Reflector();

    // Mock repository
    productRepository = {
      findOne: jest.fn(),
    } as any;

    guard = new ProductOwnerGuard(reflector, productRepository);
  });

  const createMockContext = (
    userId: string,
    params: Record<string, string>,
    product?: Product,
  ): ExecutionContext => {
    const mockRequest: any = {
      user: { userId },
      params,
      product: undefined,
    };

    const context: ExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => () => ({}),
      getClass: () => () => ({}),
    } as any;

    // Mock repository response
    if (product) {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(product);
    } else {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);
    }

    return context;
  };

  describe('canActivate', () => {
    it('should allow access when user owns the product', async () => {
      const context = createMockContext('user-123', { id: 'product-123' }, mockProduct);
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access when product belongs to another user', async () => {
      const context = createMockContext('user-123', { id: 'product-456' }, mockOtherProduct);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'You do not have permission to access this product',
      );
    });

    it('should throw NotFoundException when product does not exist', async () => {
      const context = createMockContext('user-123', { id: 'nonexistent' }, null);

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      await expect(guard.canActivate(context)).rejects.toThrow('Product not found');
    });

    it('should deny access when user is not authenticated', async () => {
      const mockRequest: any = {
        user: undefined,
        params: { id: 'product-123' },
      };

      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => () => ({}),
        getClass: () => () => ({}),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('User not authenticated');
    });

    it('should deny access when product ID is missing from request', async () => {
      const context = createMockContext('user-123', {});

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Product ID not found in request',
      );
    });

    it('should attach product to request when access is granted', async () => {
      const context = createMockContext('user-123', { id: 'product-123' }, mockProduct);
      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.product).toEqual(mockProduct);
    });
  });
});
