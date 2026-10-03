import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { CitasService } from './citas.service';

// Las citas que yo reservé como cliente, en cualquier negocio.
@ApiTags('mis-citas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mis-citas')
export class MisCitasController {
  constructor(private readonly citasService: CitasService) {}

  @Get()
  listar(@UsuarioActual() usuario: { id: number }) {
    return this.citasService.listarMias(usuario.id);
  }
}