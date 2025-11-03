// infrastructure/repositories/user.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from '../../application/ports/user.repository';
import { User } from '../../domain/entities/user';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Partial<User>): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email:           data.email!,
        password:        data.password!,
        fullName:        data.fullName!,
        emailVerified:   data.emailVerified ?? false,
        admin:           data.admin ?? false,
        createdAt:       data.createdAt ?? new Date(),
        birthDate:       data.birthDate,
        gender:          data.gender,
        country:         data.country,
        language:        data.language,
        favoriteGenres:  data.favoriteGenres ?? [],
        favoriteMedia:   data.favoriteMedia,
      },
      select: {
        id:              true,
        email:           true,
        password:        true,
        fullName:        true,
        emailVerified:   true,
        admin:           true,
        createdAt:       true,
        birthDate:       true,
        gender:          true,
        country:         true,
        language:        true,
        favoriteGenres:  true,
        favoriteMedia:   true,
      },
    });

    return new User(
      user.id,
      user.email,
      user.password,
      user.fullName,
      user.emailVerified,
      user.admin,
      user.createdAt,
      user.birthDate ?? undefined,
      user.gender ?? undefined,
      user.country ?? undefined,
      user.language ?? undefined,
      user.favoriteGenres ?? [],
      user.favoriteMedia ?? undefined,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id:              true,
        email:           true,
        password:        true,
        fullName:        true,
        emailVerified:   true,
        admin:           true,
        createdAt:       true,
        birthDate:       true,
        gender:          true,
        country:         true,
        language:        true,
        favoriteGenres:  true,
        favoriteMedia:   true,
      },
    });

    if (!user) return null;

    return new User(
      user.id,
      user.email,
      user.password,
      user.fullName,
      user.emailVerified,
      user.admin,
      user.createdAt,
      user.birthDate ?? undefined,
      user.gender ?? undefined,
      user.country ?? undefined,
      user.language ?? undefined,
      user.favoriteGenres ?? [],
      user.favoriteMedia ?? undefined,
    );
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id:              true,
        email:           true,
        password:        true,
        fullName:        true,
        emailVerified:   true,
        admin:           true,
        createdAt:       true,
        birthDate:       true,
        gender:          true,
        country:         true,
        language:        true,
        favoriteGenres:  true,
        favoriteMedia:   true,
      },
    });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id:              true,
        email:           true,
        password:        true,
        fullName:        true,
        emailVerified:   true,
        admin:           true,
        createdAt:       true,
        birthDate:       true,
        gender:          true,
        country:         true,
        language:        true,
        favoriteGenres:  true,
        favoriteMedia:   true,
      },
    });
    return users.map(this.mapToEntity);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName:        data.fullName,
        birthDate:       data.birthDate,
        gender:          data.gender,
        country:         data.country,
        language:        data.language,
        favoriteGenres:  data.favoriteGenres,
        favoriteMedia:   data.favoriteMedia,
        admin:           data.admin,
      },
      select: {
        id:              true,
        email:           true,
        password:        true,
        fullName:        true,
        emailVerified:   true,
        admin:           true,
        createdAt:       true,
        birthDate:       true,
        gender:          true,
        country:         true,
        language:        true,
        favoriteGenres:  true,
        favoriteMedia:   true,
      },
    });
    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  private mapToEntity = (user: any): User =>
    new User(
      user.id,
      user.email,
      user.password,
      user.fullName,
      user.emailVerified,
      user.admin,
      user.createdAt,
      user.birthDate ?? undefined,
      user.gender ?? undefined,
      user.country ?? undefined,
      user.language ?? undefined,
      user.favoriteGenres ?? [],
      user.favoriteMedia ?? undefined,
    );

    async deleteUserAndCleanup(userId: string): Promise<void> {
      await this.prisma.user.delete({ where: { id: userId } });
    }
}
