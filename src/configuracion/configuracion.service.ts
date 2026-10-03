import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto';

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  // Regla de negocio reutilizable: el negocio debe existir y ser del usuario.
  private async verificarNegocioPropio(negocioId: number, duenoId: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
    });
    if (!negocio) {
      throw new NotFoundException('El negocio no existe');
    }
    if (negocio.duenoId !== duenoId) {
      throw new ForbiddenException('Este negocio no es tuyo');
    }
    return negocio;
  }

  async obtener(negocioId: number, duenoId: number) {
    await this.verificarNegocioPropio(negocioId, duenoId);
    return this.prisma.configuracion.findUnique({ where: { negocioId } });
  }

  async actualizar(
    negocioId: number,
    duenoId: number,
    dto: ActualizarConfiguracionDto,
  ) {
    await this.verificarNegocioPropio(negocioId, duenoId);
    return this.prisma.configuracion.update({
      where: { negocioId },
      data: dto,
    });
  }
}