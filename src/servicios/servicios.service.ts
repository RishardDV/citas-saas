import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearServicioDto } from './dto/crear-servicio.dto';

@Injectable()
export class ServiciosService {
  constructor(private readonly prisma: PrismaService) {}

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

  async crear(dto: CrearServicioDto, negocioId: number, duenoId: number) {
    await this.verificarNegocioPropio(negocioId, duenoId);

    return this.prisma.servicio.create({
      data: {
        nombre: dto.nombre,
        duracionMin: dto.duracionMin,
        precio: dto.precio,
        negocioId,
      },
    });
  }

  async listarPorNegocio(negocioId: number, duenoId: number) {
    await this.verificarNegocioPropio(negocioId, duenoId);

    return this.prisma.servicio.findMany({
      where: { negocioId },
      orderBy: { id: 'asc' },
    });
  }
}
