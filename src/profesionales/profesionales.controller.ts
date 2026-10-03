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
import { CrearProfesionalDto } from './dto/crear-profesional.dto';
import { ProfesionalesService } from './profesionales.service';

@ApiTags('profesionales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('negocios/:negocioId/profesionales')
export class ProfesionalesController {
  constructor(private readonly profesionalesService: ProfesionalesService) {}

  @Post()
  crear(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @Body() dto: CrearProfesionalDto,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.profesionalesService.crear(negocioId, usuario.id, dto);
  }

  @Get()
  listarPorNegocio(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.profesionalesService.listarPorNegocio(negocioId, usuario.id);
  }

  @Post(':profesionalId/servicios/:servicioId')
  asignarServicio(
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Param('servicioId', ParseIntPipe) servicioId: number,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.profesionalesService.asignarServicio(
      profesionalId,
      servicioId,
      usuario.id,
    );
  }

  @Delete(':profesionalId/servicios/:servicioId')
  quitarServicio(
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
