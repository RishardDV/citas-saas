import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    UseGuards,
  } from '@nestjs/common';
  import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
  import { JwtAuthGuard } from '../auth/jwt-auth.guard';
  import { PlanProGuard } from './plan-pro.guard';
  import { AsistenteIaService } from './asistente-ia.service';
  
  @ApiTags('asistente-ia')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlanProGuard)
  @Controller('negocios/:negocioId/citas/:citaId/mensaje-ia')
  export class AsistenteIaController {
    constructor(private readonly asistenteIaService: AsistenteIaService) {}
  
    @Get()
    generar(
      @Param('negocioId', ParseIntPipe) negocioId: number,
      @Param('citaId', ParseIntPipe) citaId: number,
    ) {
      return this.asistenteIaService.generarMensajeCita(negocioId, citaId);
    }
  }