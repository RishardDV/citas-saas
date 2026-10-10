import {
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
import { SuscripcionesService } from './suscripciones.service';

@ApiTags('suscripcion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('negocios/:negocioId/suscripcion')
export class SuscripcionesController {
  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  @Get()
  estado(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.suscripcionesService.estado(negocioId, usuario.id);
  }

  @Post('checkout')
  checkout(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.suscripcionesService.crearCheckout(negocioId, usuario.id);
  }
}