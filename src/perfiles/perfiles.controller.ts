import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { PerfilesService } from './perfiles.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

@ApiTags('perfil')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('perfil')
export class PerfilesController {
  constructor(private readonly perfilesService: PerfilesService) {}

  @Get()
  obtenerMio(@UsuarioActual() usuario: { id: number }) {
    return this.perfilesService.obtenerMio(usuario.id);
  }

  @Put()
  actualizarMio(
    @UsuarioActual() usuario: { id: number },
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.perfilesService.actualizarMio(usuario.id, dto);
  }
}