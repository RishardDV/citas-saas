import {
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';

  @Injectable()
  export class AsistenteIaService {
    private readonly logger = new Logger(AsistenteIaService.name);

    constructor(private readonly prisma: PrismaService) {}
  
    async generarMensajeCita(negocioId: number, citaId: number) {
      const cita = await this.prisma.cita.findUnique({
        where: { id: citaId },
        include: {
          cliente: { select: { nombre: true } },
          servicio: { select: { nombre: true, duracionMin: true } },
          profesional: { select: { nombre: true } },
          negocio: { select: { nombre: true } },
        },
      });
  
      if (!cita || cita.negocioId !== negocioId) {
        throw new NotFoundException('La cita no existe en este negocio');
      }
  
      const fecha = new Date(cita.fecha).toLocaleString('es-CO', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
  
      const prompt =
        `Eres el asistente de la barbería/negocio "${cita.negocio.nombre}". ` +
        `Escribe un mensaje de WhatsApp corto (2 o 3 frases), cálido y en español colombiano neutro, ` +
        `para CONFIRMARLE la cita al cliente. Datos: cliente ${cita.cliente.nombre}, ` +
        `servicio "${cita.servicio.nombre}" (${cita.servicio.duracionMin} min) ` +
        `con ${cita.profesional.nombre}, el ${fecha}. ` +
        `No inventes datos que no te di. Puedes usar un emoji discreto.`;
  
      const { texto, aviso } = await this.llamarIA(prompt);
      if (texto) {
        return { modo: 'ia', mensaje: texto.trim() };
      }
  
      // Sin API key, o Gemini saturado tras reintentar: mensaje de plantilla.
      return {
        modo: 'simulado',
        ...(aviso && { aviso }),
        mensaje:
          `¡Hola ${cita.cliente.nombre}! 👋 Te confirmamos tu cita en ${cita.negocio.nombre}: ` +
          `${cita.servicio.nombre} con ${cita.profesional.nombre}, el ${fecha.replace(/\.$/, '')}. ` +
          `¡Te esperamos!`,
      };
    }
  
    // Devuelve el texto generado, o null + aviso si Gemini está temporalmente
    // caído/saturado. Los errores de configuración (modelo, cuota, key) sí se lanzan.
    private async llamarIA(
      prompt: string,
    ): Promise<{ texto: string | null; aviso?: string }> {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return { texto: null };
      }
  
      const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const esperas = [1000, 3000]; // hasta 2 reintentos si Gemini responde "ocupado"
  
      for (let intento = 0; ; intento++) {
        let res: Response;
        try {
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Sin límite, si Gemini no contesta la petición a nuestra API queda colgada.
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              // Los modelos Pro "piensan" antes de responder y ese razonamiento
              // también consume tokens: con 300 la respuesta puede salir vacía.
              generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            }),
          });
        } catch (e) {
          const aviso =
            e instanceof Error && e.name === 'TimeoutError'
              ? `Gemini ("${model}") no respondió en 15 segundos; se usó el mensaje de plantilla`
              : 'No se pudo conectar con Gemini; se usó el mensaje de plantilla';
          this.logger.warn(aviso);
          return { texto: null, aviso };
        }
  
        // 500/503: saturación o fallo pasajero de Google → reintentar y, si sigue, plantilla.
        if (res.status === 500 || res.status === 503) {
          const cuerpo: any = await res.json().catch(() => null);
          this.logger.warn(
            `Gemini ${res.status} con "${model}" (intento ${intento + 1}): ${cuerpo?.error?.message ?? res.statusText}`,
          );
          if (intento < esperas.length) {
            await new Promise((r) => setTimeout(r, esperas[intento]));
            continue;
          }
          return {
            texto: null,
            aviso: `Gemini ("${model}") está saturado en este momento; se usó el mensaje de plantilla`,
          };
        }
  
        if (!res.ok) {
          const cuerpo: any = await res.json().catch(() => null);
          const detalle = cuerpo?.error?.message ?? res.statusText;
          this.logger.warn(`Gemini ${res.status} con el modelo "${model}": ${detalle}`);
          const motivos: Record<number, string> = {
            400: 'la petición o la API key no son válidas',
            403: 'la API key no tiene permiso para usar Gemini',
            404: `el modelo "${model}" no existe o ya no está disponible (revisa GEMINI_MODEL)`,
            429: `sin cuota para el modelo "${model}" (los modelos Pro requieren facturación activa)`,
          };
          throw new ServiceUnavailableException(
            `La IA no está disponible: ${motivos[res.status] ?? `Gemini respondió ${res.status}`}`,
          );
        }
  
        const data: any = await res.json();
        // Juntamos todas las partes de texto (algunos modelos dividen la respuesta).
        const partes: { text?: string; thought?: boolean }[] =
          data?.candidates?.[0]?.content?.parts ?? [];
        const texto = partes
          .filter((p) => p.text && !p.thought)
          .map((p) => p.text)
          .join('');
        return { texto: texto || null };
      }
    }
  }
