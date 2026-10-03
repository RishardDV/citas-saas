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
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { ServiciosService } from './servicios.service';

@ApiTags('servicios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('negocios/:negocioId/servicios')
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  @Post()
  crear(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @Body() dto: CrearServicioDto,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.serviciosService.crear(dto, negocioId, usuario.id);
  }

  @Get()
  listarPorNegocio(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.serviciosService.listarPorNegocio(negocioId, usuario.id);
  }
}
