import { Module } from '@nestjs/common';
import { ProfesionalesService } from './profesionales.service';
import { ProfesionalesController } from './profesionales.controller';
import { AsignacionesController } from './asignaciones.controller';

@Module({
  controllers: [ProfesionalesController, AsignacionesController],
  providers: [ProfesionalesService],
})
export class ProfesionalesModule {}