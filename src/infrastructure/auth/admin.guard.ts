import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const userData = await this.prisma.user.findUnique({
      where: { id: user.sub }
    }) as any;

    if (!userData || !userData.admin) {
      throw new ForbiddenException('Acceso denegado: se requieren permisos de administrador');
    }

    return true;
  }
}