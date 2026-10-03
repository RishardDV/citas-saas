import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearProfesionalDto } from './dto/crear-profesional.dto';

@Injectable()
export class ProfesionalesService {
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
  }

  // Trae el profesional y valida que su negocio sea del usuario. Reutilizable.
  private async obtenerProfesionalPropio(profesionalId: number, duenoId: number) {
    const profesional = await this.prisma.profesional.findUnique({
      where: { id: profesionalId },
      include: { negocio: true },
    });
    if (!profesional) {
      throw new NotFoundException('El profesional no existe');
    }
    if (profesional.negocio.duenoId !== duenoId) {
      throw new ForbiddenException('Este profesional no es tuyo');
    }
    return profesional;
  }

  async crear(negocioId: number, duenoId: number, dto: CrearProfesionalDto) {
    await this.verificarNegocioPropio(negocioId, duenoId);
    return this.prisma.profesional.create({
      data: {
        nombre: dto.nombre,
        especialidad: dto.especialidad,
        negocioId,
      },
    });
  }

  async listarPorNegocio(negocioId: number, duenoId: number) {
    await this.verificarNegocioPropio(negocioId, duenoId);
    return this.prisma.profesional.findMany({
      where: { negocioId },
      orderBy: { id: 'asc' },
    });
  }

  // ─── Relación N:M: asignar un servicio a un profesional ───
  async asignarServicio(
    profesionalId: number,
    servicioId: number,
    duenoId: number,
  ) {
    const profesional = await this.obtenerProfesionalPropio(
      profesionalId,
      duenoId,
    );

    const servicio = await this.prisma.servicio.findUnique({
      where: { id: servicioId },
    });
    if (!servicio) {
      throw new NotFoundException('El servicio no existe');
    }

    // Regla de negocio: servicio y profesional deben ser del MISMO negocio.
    if (servicio.negocioId !== profesional.negocioId) {
      throw new BadRequestException(
        'El servicio y el profesional deben pertenecer al mismo negocio',
      );
    }

    const yaAsignado = await this.prisma.servicioProfesional.findUnique({
      where: { servicioId_profesionalId: { servicioId, profesionalId } },
    });
    if (yaAsignado) {
      throw new ConflictException('El profesional ya ofrece este servicio');
    }

    return this.prisma.servicioProfesional.create({
      data: { servicioId, profesionalId },
    });
  }

  async quitarServicio(
    profesionalId: number,
    servicioId: number,
    duenoId: number,
  ) {
    await this.obtenerProfesionalPropio(profesionalId, duenoId);

    const asignacion = await this.prisma.servicioProfesional.findUnique({
      where: { servicioId_profesionalId: { servicioId, profesionalId } },
    });
    if (!asignacion) {
      throw new NotFoundException('El profesional no ofrece este servicio');
    }

    await this.prisma.servicioProfesional.delete({
      where: { servicioId_profesionalId: { servicioId, profesionalId } },
    });
    return { mensaje: 'Servicio retirado del profesional' };
  }

  async listarServicios(profesionalId: number, duenoId: number) {
    await this.obtenerProfesionalPropio(profesionalId, duenoId);
    const asignaciones = await this.prisma.servicioProfesional.findMany({
      where: { profesionalId },
      include: { servicio: true },
      orderBy: { servicioId: 'asc' },
    });
    return asignaciones.map((a) => a.servicio);
  }
}