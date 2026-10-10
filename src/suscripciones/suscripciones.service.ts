import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { Plan, EstadoSuscripcion } from '@prisma/client';

@Injectable()
export class SuscripcionesService {
  private readonly stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
  );

  constructor(private readonly prisma: PrismaService) {}

  private async verificarNegocioPropio(negocioId: number, duenoId: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
    });
    if (!negocio) {
      throw new NotFoundException('El negocio no existe');
    }
    if (negocio.duenoId !== duenoId) {
      throw new ForbiddenException('Este negocio no es tuyo');
    }
    return negocio;
  }

  async estado(negocioId: number, duenoId: number) {
    await this.verificarNegocioPropio(negocioId, duenoId);
    return this.prisma.suscripcion.findUnique({ where: { negocioId } });
  }

  async crearCheckout(negocioId: number, duenoId: number) {
    const negocio = await this.verificarNegocioPropio(negocioId, duenoId);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `AgendaFácil PRO — ${negocio.nombre}` },
            unit_amount: 900,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      // Vuelve al panel (/app), que lleva a la pestaña Suscripción del negocio.
      success_url: `${process.env.APP_URL}/app/?pago=ok&negocio=${negocioId}`,
      cancel_url: `${process.env.APP_URL}/app/?pago=cancelado&negocio=${negocioId}`,
      metadata: { negocioId: String(negocioId) },
    });

    return { url: session.url };
  }

  async procesarEvento(rawBody: Buffer, firma: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let evento: Stripe.Event;
    try {
      evento = this.stripe.webhooks.constructEvent(rawBody, firma, secret);
    } catch {
      throw new BadRequestException('Firma de webhook inválida');
    }

    if (evento.type === 'checkout.session.completed') {
      const session = evento.data.object as Stripe.Checkout.Session;
      const negocioId = Number(session.metadata?.negocioId);

      if (negocioId) {
        await this.prisma.suscripcion.update({
          where: { negocioId },
          data: {
            plan: Plan.PRO,
            estado: EstadoSuscripcion.ACTIVA,
            stripeCustomerId: (session.customer as string) ?? null,
            stripeSubscriptionId: (session.subscription as string) ?? null,
            vigenteHasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    return { recibido: true };
  }
}