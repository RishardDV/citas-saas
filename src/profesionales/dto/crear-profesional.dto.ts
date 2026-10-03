import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CrearProfesionalDto {
  @ApiProperty({ example: 'Carlos Ruiz' })
  @IsString({ message: 'El nombre debe ser texto' })
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres' })
  nombre!: string;

  @ApiPropertyOptional({ example: 'Barbero' })
  @IsOptional()
  @IsString({ message: 'La especialidad debe ser texto' })
  @Length(2, 80, { message: 'La especialidad debe tener entre 2 y 80 caracteres' })
  especialidad?: string;
}
