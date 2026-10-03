import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearCitaDto {
  @ApiProperty({ example: 1, description: 'ID del servicio a reservar' })
  @IsInt()
  @IsPositive()
  servicioId!: number;

  @ApiProperty({ example: 1, description: 'ID del profesional que atenderá' })
  @IsInt()
  @IsPositive()
  profesionalId!: number;

  @ApiProperty({ example: '2026-10-01T15:00:00.000Z', description: 'Fecha y hora en formato ISO 8601' })
  @IsISO8601({}, { message: 'La fecha debe estar en formato ISO 8601' })
  fecha!: string;

  @ApiPropertyOptional({ example: 'Pidió corte bajo' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;
}