import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { Rol } from '@prisma/client';
  import { Roles } from './roles.decorator';
  
  @Injectable()
  export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}
  
    canActivate(context: ExecutionContext): boolean {
      const rolesRequeridos = this.reflector.get(Roles, context.getHandler());
  
      if (!rolesRequeridos) {
        return true;
      }
  
      const request = context.switchToHttp().getRequest();
      const usuario = request.user as { rol: Rol };
  
      if (!rolesRequeridos.includes(usuario.rol)) {
        throw new ForbiddenException('No tienes permiso para realizar esta acción');
      }
  
      return true;
    }
  }