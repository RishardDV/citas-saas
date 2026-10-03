import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class ActualizarConfiguracionDto {
  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de apertura debe tener formato HH:MM (24h)',
  })
  horaApertura?: string;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de cierre debe tener formato HH:MM (24h)',
  })
  horaCierre?: string;

  @ApiPropertyOptional({ example: 'America/Bogota' })
  @IsOptional()
  @IsString()
  zonaHoraria?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  @Min(5, { message: 'La duración por defecto no puede ser menor a 5 minutos' })
  @Max(480, { message: 'La duración por defecto no puede superar 480 minutos' })
  duracionDefault?: number;
}