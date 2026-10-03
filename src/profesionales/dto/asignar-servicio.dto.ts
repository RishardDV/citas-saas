import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AsignarServicioDto {
  @ApiProperty({
    example: 1,
    description: 'ID del servicio a asignar al profesional',
  })
  @IsInt({ message: 'El servicioId debe ser un entero' })
  @IsPositive({ message: 'El servicioId debe ser positivo' })
  servicioId!: number;
}
