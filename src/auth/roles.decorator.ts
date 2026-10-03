import { Reflector } from '@nestjs/core';
import { Rol } from '@prisma/client';

export const Roles = Reflector.createDecorator<Rol[]>();