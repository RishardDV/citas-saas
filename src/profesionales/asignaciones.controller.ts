import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { ProfesionalesService } from './profesionales.service';
import { AsignarServicioDto } from './dto/asignar-servicio.dto';

// Controlador dedicado a la relación N:M entre profesional y servicio.
@ApiTags('profesionales-servicios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profesionales/:profesionalId/servicios')
export class AsignacionesController {
  constructor(private readonly profesionalesService: ProfesionalesService) {}

  @Post()
  asignar(
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @UsuarioActual() usuario: { id: number },
    @Body() dto: AsignarServicioDto,
  ) {
    return this.profesionalesService.asignarServicio(
      profesionalId,
      dto.servicioId,
      usuario.id,
    );
  }

  @Get()
  listar(
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.profesionalesService.listarServicios(profesionalId, usuario.id);
  }

  @Delete(':servicioId')
  quitar(
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Param('servicioId', ParseIntPipe) servicioId: number,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.profesionalesService.quitarServicio(
      profesionalId,
      servicioId,
      usuario.id,
    );
  }
}