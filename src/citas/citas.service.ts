import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCita } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearCitaDto } from './dto/crear-cita.dto';

@Injectable()
export class CitasService {
  constructor(private readonly prisma: PrismaService) {}

  // Reservar: lo hace el CLIENTE logueado (clienteId viene de su token).
  async crear(negocioId: number, clienteId: number, dto: CrearCitaDto) {
    // El negocio debe existir (NO se exige ser el dueño: un cliente reserva
    // en un negocio que no es suyo).
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
    });
    if (!negocio) {
      throw new NotFoundException('El negocio no existe');
    }

    // Servicio y profesional deben ser de ESTE negocio.
    const servicio = await this.prisma.servicio.findUnique({
      where: { id: dto.servicioId },
    });
    if (!servicio || servicio.negocioId !== negocioId) {
      throw new BadRequestException('El servicio no pertenece a este negocio');
    }

    const profesional = await this.prisma.profesional.findUnique({
      where: { id: dto.profesionalId },
    });
    if (!profesional || profesional.negocioId !== negocioId) {
      throw new BadRequestException('El profesional no pertenece a este negocio');
    }

    // El profesional debe OFRECER ese servicio (usa la relación N:M de hoy).
    const ofrece = await this.prisma.servicioProfesional.findUnique({
      where: {
        servicioId_profesionalId: {
          servicioId: dto.servicioId,
          profesionalId: dto.profesionalId,
        },
      },
    });
    if (!ofrece) {
      throw new BadRequestException(
        'El profesional no ofrece el servicio seleccionado',
      );
    }

    // Sin cruces: la nueva cita no puede solapar otra del mismo profesional.
    const inicio = new Date(dto.fecha);
    const fin = new Date(inicio.getTime() + servicio.duracionMin * 60000);

    const citasProfesional = await this.prisma.cita.findMany({
      where: {
        profesionalId: dto.profesionalId,
        estado: { not: EstadoCita.CANCELADA },
      },
      include: { servicio: true },
    });

    const hayCruce = citasProfesional.some((c) => {
      const cInicio = new Date(c.fecha);
      const cFin = new Date(cInicio.getTime() + c.servicio.duracionMin * 60000);
      return cInicio < fin && inicio < cFin;
    });
    if (hayCruce) {
      throw new ConflictException(
        'El profesional ya tiene una cita en ese horario',
      );
    }

    return this.prisma.cita.create({
      data: {
        fecha: inicio,
        notas: dto.notas,
        negocioId,
        clienteId,
        servicioId: dto.servicioId,
        profesionalId: dto.profesionalId,
      },
    });
  }

  // Listar las citas de un negocio: solo su DUENO (autorización por propiedad).
  async listarPorNegocio(negocioId: number, duenoId: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
    });
    if (!negocio) {
      throw new NotFoundException('El negocio no existe');
    }
    if (negocio.duenoId !== duenoId) {
      throw new ForbiddenException('Este negocio no es tuyo');
    }
    return this.prisma.cita.findMany({
      where: { negocioId },
      include: {
        cliente: { select: { id: true, nombre: true } },
        servicio: { select: { id: true, nombre: true, duracionMin: true } },
        profesional: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: 'asc' },
    });
  }

  // Listar MIS citas como cliente (las que yo reservé, en cualquier negocio).
  listarMias(clienteId: number) {
    return this.prisma.cita.findMany({
      where: { clienteId },
      include: {
        negocio: { select: { id: true, nombre: true } },
        servicio: { select: { id: true, nombre: true } },
        profesional: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: 'asc' },
    });
  }
}