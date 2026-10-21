import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserRegisterDto } from './dto/user-register-dto';
import { UserLoginDto } from './dto/user-login-dto';
import { UserResponseDto } from './dto/user-response-dto';

@ApiTags('users')
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @HttpCode(201)
  register(@Body() dto: UserRegisterDto) {
    return this.userService.register(dto);
  }

  @Get('users/:username/salt')
  @ApiOperation({ summary: 'Get the salt needed to derive keys before login' })
  getSalt(@Param('username') username: string) {
    return this.userService.getSalt(username);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate user' })
  @ApiResponse({ status: 200, description: 'Authenticated', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: UserLoginDto) {
    return this.userService.login(dto);
  }

  @Get('users/:username')
  @ApiOperation({ summary: 'Get user by username' })
  getUserByUsername(@Param('username') username: string) {
    return this.userService.getUserByUsername(username);
  }
}