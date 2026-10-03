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
  import { NegociosService } from './negocios.service';
  import { CrearNegocioDto } from './dto/crear-negocio.dto';
  
  @ApiTags('negocios')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('negocios')
  export class NegociosController {
    constructor(private readonly negociosService: NegociosService) {}
  
    @Post()
    crear(
      @Body() dto: CrearNegocioDto,
      @UsuarioActual() usuario: { id: number },
    ) {
      return this.negociosService.crear(dto, usuario.id);
    }
  
    @Get()
    obtenerMios(@UsuarioActual() usuario: { id: number }) {
      return this.negociosService.obtenerMios(usuario.id);
    }
  
    @Get(':id')
    obtenerUno(
      @Param('id', ParseIntPipe) id: number,
      @UsuarioActual() usuario: { id: number },
    ) {
      return this.negociosService.obtenerUno(id, usuario.id);
    }
  }