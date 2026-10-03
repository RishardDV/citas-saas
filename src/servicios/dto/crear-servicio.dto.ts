import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Length,
  Min,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function IsTwoDecimalPlaces(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isTwoDecimalPlaces',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
            return false;
          }

          return Number(value.toFixed(2)) === value;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} debe tener máximo 2 decimales`;
        },
      },
    });
  };
}

export class CrearServicioDto {
  @ApiProperty({ example: 'Corte de cabello' })
  @IsString({ message: 'El nombre debe ser texto' })
  @Length(3, 80, { message: 'El nombre debe tener entre 3 y 80 caracteres' })
  nombre!: string;

  @ApiProperty({ example: 45 })
  @Type(() => Number)
  @IsInt({ message: 'La duración debe ser un entero' })
  @Min(5, { message: 'La duración mínima debe ser 5 minutos' })
  duracionMin!: number;

  @ApiProperty({ example: 25000.5 })
  @Transform(({ value }) => Number(value))
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @IsPositive({ message: 'El precio debe ser mayor a 0' })
  @Min(0.01, { message: 'El precio debe ser mayor a 0' })
  @IsTwoDecimalPlaces({ message: 'El precio debe tener máximo 2 decimales' })
  precio!: number;
}
