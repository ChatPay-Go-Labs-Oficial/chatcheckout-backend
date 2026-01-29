import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResourceOwnerGuard } from './resource-owner.guard';

describe('ResourceOwnerGuard', () => {
  let guard: ResourceOwnerGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new ResourceOwnerGuard(reflector);
  });

  const createMockContext = (
    userId: string,
    params: Record<string, string>,
    ownerParam?: string,
  ): ExecutionContext => {
    const mockRequest = {
      user: { userId },
      params,
    };

    const mockHandler = ownerParam ? () => ({}) : () => ({});
    const mockClass = () => ({});

    const context: ExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as any;

    // Set metadata if ownerParam is provided
    if (ownerParam) {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(ownerParam);
    } else {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    }

    return context;
  };

  describe('canActivate', () => {
    it('should allow access when user ID matches resource ID (default param)', () => {
      const context = createMockContext('user-123', { id: 'user-123' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user ID matches custom resource parameter', () => {
      const context = createMockContext('user-456', { userId: 'user-456' }, 'userId');
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user ID does not match resource ID', () => {
      const context = createMockContext('user-123', { id: 'user-456' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'You do not have permission to access this resource',
      );
    });

    it('should deny access when user is not authenticated', () => {
      const mockRequest = {
        user: undefined,
        params: { id: 'user-123' },
      };

      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => () => ({}),
        getClass: () => () => ({}),
      } as any;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should deny access when resource parameter is missing', () => {
      const context = createMockContext('user-123', {});

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        "Resource parameter 'id' not found in request",
      );
    });

    it('should work with different parameter names', () => {
      // Test with 'resourceId' parameter
      let context = createMockContext('user-789', { resourceId: 'user-789' }, 'resourceId');
      expect(guard.canActivate(context)).toBe(true);

      // Test with 'accountId' parameter
      context = createMockContext('user-789', { accountId: 'user-789' }, 'accountId');
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
