import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  
  @Catch()
  export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
  
      const esExcepcionHttp = exception instanceof HttpException;
      const statusCode = esExcepcionHttp
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
  
      let mensaje: string | string[] = 'Error interno del servidor';
      if (esExcepcionHttp) {
        const cuerpo = exception.getResponse();
        mensaje = typeof cuerpo === 'string' ? cuerpo : (cuerpo as any).message;
      } else {
        console.error(exception);
      }
  
      response.status(statusCode).json({
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: mensaje,
      });
    }
  }