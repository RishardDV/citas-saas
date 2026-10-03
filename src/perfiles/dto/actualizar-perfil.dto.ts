import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarPerfilDto {
  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ example: 'Barbero con 10 años de experiencia' })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'La bio no puede superar 300 caracteres' })
  bio?: string;

  @ApiPropertyOptional({ example: 'https://.../avatar.png' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  avatarUrl?: string;
}