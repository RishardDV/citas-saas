import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { Plan } from '@prisma/client';
  
  @Injectable()
  export class PlanProGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const usuario = request.user as { id: number };
      const negocioId = Number(request.params.negocioId);
  
      const negocio = await this.prisma.negocio.findUnique({
        where: { id: negocioId },
        include: { suscripcion: true },
      });
  
      if (!negocio) {
        throw new NotFoundException('El negocio no existe');
      }
      if (negocio.duenoId !== usuario.id) {
        throw new ForbiddenException('Este negocio no es tuyo');
      }
      if (negocio.suscripcion?.plan !== Plan.PRO) {
        throw new HttpException(
          'Esta función es exclusiva del plan PRO. Actualiza tu suscripción.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
  
      return true;
    }
  }