import { Module } from '@nestjs/common';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import { MisCitasController } from './mis-citas.controller';

@Module({
  controllers: [CitasController, MisCitasController],
  providers: [CitasService],
})
export class CitasModule {}