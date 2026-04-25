import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No specific roles required
    }

    const { user } = context.switchToHttp().getRequest();
    // user.role should be mapped during AuthGuard based on JWT or database fetch
    // For our app, AuthGuard doesn't append user role currently, it only appends { id, email, firebaseUid }.
    // So we need to make sure AuthGuard populates user.role, or we fetch it here!
    
    // To be safe, if we trust the user object has a role, we check it:
    return requiredRoles.includes(user?.role);
  }
}
