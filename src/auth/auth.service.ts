import {
    ConflictException,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import * as bcrypt from 'bcrypt';
  import { PrismaService } from '../prisma/prisma.service';
  import { RegisterDto } from './dto/register.dto';
  import { LoginDto } from './dto/login.dto';
  import { Rol } from '@prisma/client';
  
  @Injectable()
  export class AuthService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly jwtService: JwtService,
    ) {}
  
    async register(dto: RegisterDto) {
      
      const existente = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });
      if (existente) {
        throw new ConflictException('El email ya está registrado');
      }
  
      const hash = await bcrypt.hash(dto.password, 10);
  
      // Onboarding self-service: quien se registra viene a montar su negocio.
      const usuario = await this.prisma.usuario.create({
        data: {
          nombre: dto.nombre,
          email: dto.email,
          password: hash,
          rol: Rol.CLIENTE,
        },
      });
  
      return {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      };
    }
  
    async login(dto: LoginDto) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });
      if (!usuario) {
        throw new UnauthorizedException('Credenciales inválidas');
      }
  
      const passwordOk = await bcrypt.compare(dto.password, usuario.password);
      if (!passwordOk) {
        throw new UnauthorizedException('Credenciales inválidas');
      }
  
      const payload = {
        sub: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      };
      const access_token = await this.jwtService.signAsync(payload);
  
      return { access_token };
    }
  }