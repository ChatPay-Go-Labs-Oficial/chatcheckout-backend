import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify which route parameter contains the resource owner ID.
 *
 * Usage:
 * @OwnerParam('userId') - checks if req.params.userId matches req.user.userId
 * @OwnerParam('id') - checks if req.params.id matches req.user.userId
 *
 * This decorator works with ResourceOwnerGuard to provide flexible parameter matching.
 */
export const OWNER_PARAM_KEY = 'ownerParam';

export const OwnerParam = (paramName: string) => SetMetadata(OWNER_PARAM_KEY, paramName);
