import { Module } from '@nestjs/common';
import { SuscripcionesService } from './suscripciones.service';
import { SuscripcionesController } from './suscripciones.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  controllers: [SuscripcionesController, StripeWebhookController],
  providers: [SuscripcionesService],
  exports: [SuscripcionesService],
})
export class SuscripcionesModule {}