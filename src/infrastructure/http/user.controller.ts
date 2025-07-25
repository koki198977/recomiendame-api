import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { CreateUserDto } from '../dtos/create-user.dto';
import { VerifyEmailUseCase } from 'src/application/use-cases/verify-email.use-case';
import { GetUserByIdUseCase } from 'src/application/use-cases/get-user-by-id.use-case';
import { ListUsersUseCase } from 'src/application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from 'src/application/use-cases/update-user.use-case';
import { DeleteUserUseCase } from 'src/application/use-cases/delete-user.use-case';
import { User } from 'src/domain/entities/user';

@Controller('users')
export class UserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
) {}

  @Post()
  async register(@Body() dto: CreateUserDto) {
    return this.createUser.execute(dto);
  }

  @Get('verify-email')
  async verify(@Query('token') token: string) {
    await this.verifyEmail.execute(token);
    return { message: 'Correo verificado con éxito' };
  }

  @Get()
  async findAll(): Promise<User[]> {
    return this.listUsersUseCase.execute();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<User> {
    return this.getUserByIdUseCase.execute(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<User>,
  ): Promise<User> {
    return this.updateUserUseCase.execute(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.deleteUserUseCase.execute(id);
    return { message: 'Usuario eliminado con éxito' };
  }
}
