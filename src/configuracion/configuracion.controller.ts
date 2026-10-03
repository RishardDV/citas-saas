import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { ConfiguracionService } from './configuracion.service';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto';

@ApiTags('configuracion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('negocios/:negocioId/configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  obtener(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @UsuarioActual() usuario: { id: number },
  ) {
    return this.configuracionService.obtener(negocioId, usuario.id);
  }

  @Patch()
  actualizar(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @UsuarioActual() usuario: { id: number },
    @Body() dto: ActualizarConfiguracionDto,
  ) {
    return this.configuracionService.actualizar(negocioId, usuario.id, dto);
  }
}