import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

@Injectable()
export class PerfilesService {
  constructor(private readonly prisma: PrismaService) {}

  // Devuelve el perfil del usuario junto con sus datos básicos (sin la contraseña).
  obtenerMio(usuarioId: number) {
    return this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        perfil: true,
      },
    });
  }

  // Crea el perfil si no existe, o lo actualiza si ya existe (relación 1:1).
  actualizarMio(usuarioId: number, dto: ActualizarPerfilDto) {
    return this.prisma.perfil.upsert({
      where: { usuarioId },
      create: { usuarioId, ...dto },
      update: { ...dto },
    });
  }
}