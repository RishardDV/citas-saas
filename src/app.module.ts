import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { NegociosModule } from './negocios/negocios.module';
import { PerfilesModule } from './perfiles/perfiles.module';
import { ProfesionalesModule } from './profesionales/profesionales.module';
import { ServiciosModule } from './servicios/servicios.module';
import { CitasModule } from './citas/citas.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { SuscripcionesModule } from './suscripciones/suscripciones.module';
import { AsistenteIaModule } from './asistente-ia/asistente-ia.module';

@Module({
  imports: [
    // Infraestructura
    PrismaModule,
    // Ya construido (M3, reusado)
    AuthModule,
    // Funcional desde C1
    NegociosModule,
    // Funcional hoy (C2): perfiles, configuración, relaciones avanzadas y la reserva
    PerfilesModule,
    ConfiguracionModule,
    ServiciosModule,
    ProfesionalesModule,
    CitasModule,
    // Esqueleto — se construyen en C3
    SuscripcionesModule,
    AsistenteIaModule,
  ],
})
export class AppModule {}