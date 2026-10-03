import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { CitasService } from './citas.service';
import { CrearCitaDto } from './dto/crear-cita.dto';

@ApiTags('citas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('negocios/:negocioId/citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  // Reservar: cualquier usuario logueado (actúa como cliente).
  @Post()
  reservar(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @UsuarioActual() usuario: { id: number },
    @Body() dto: CrearCitaDto,
  ) {
    return this.citasService.crear(negocioId, usuario.id, dto);
  }

  // Ver la agenda del negocio: solo su dueño.
  @Get()
  listarDelNegocio(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.citasService.listarPorNegocio(negocioId, usuario.id);
  }
}