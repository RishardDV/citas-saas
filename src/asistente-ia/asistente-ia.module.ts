import { Module } from '@nestjs/common';
import { AsistenteIaService } from './asistente-ia.service';
import { AsistenteIaController } from './asistente-ia.controller';
import { PlanProGuard } from './plan-pro.guard';

@Module({
  controllers: [AsistenteIaController],
  providers: [AsistenteIaService, PlanProGuard],
})
export class AsistenteIaModule {}