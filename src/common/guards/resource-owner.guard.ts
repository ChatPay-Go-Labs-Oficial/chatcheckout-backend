import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { OWNER_PARAM_KEY } from './owner-params.decorator';

/**
 * Guard to verify that the authenticated user is the owner of the resource.
 *
 * Usage in controllers:
 * @UseGuards(ResourceOwnerGuard)
 *
 * By default, the guard extracts the resource ID from the :id route parameter.
 * You can customize which parameter to check using @OwnerParam('paramName') decorator.
 *
 * Examples:
 * - @UseGuards(ResourceOwnerGuard) - checks req.params.id
 * - @OwnerParam('userId') with @UseGuards(ResourceOwnerGuard) - checks req.params.userId
 *
 * The guard compares the parameter value with the authenticated user's ID from the JWT token.
 * This prevents users from accessing/modifying/deleting resources belonging to other users.
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { userId: string } | undefined;

    if (!user || !user.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get the parameter name to check from metadata (defaults to 'id')
    const paramName = this.reflector.getAllAndOverride<string>(OWNER_PARAM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'id';

    // Get the resource ID from route parameters
    const resourceId = request.params[paramName];

    if (!resourceId) {
      throw new ForbiddenException(`Resource parameter '${paramName}' not found in request`);
    }

    // Check if the authenticated user is the owner of the resource
    if (user.userId !== resourceId) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
