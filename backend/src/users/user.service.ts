import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRegisterDto } from './dto/user-register-dto';
import { UserLoginDto } from './dto/user-login-dto';

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: UserRegisterDto) {
  try {
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        username: dto.username,
        salt: dto.salt,
        publicKey: dto.publicKey,
        encryptedPrivateKey: dto.encryptedPrivateKey,
        authKey: dto.authKey,
      },
      select: { id: true, username: true },
    });

    return {
      status: 'ok',
      code: 'USER_CREATED',
      message: 'User created',
      data: user,
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Username already taken');
    }
    throw e;
  }
}

  async getSalt(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { salt: true },
    });

    const salt =
      user?.salt ??
      createHmac('sha256', process.env.SALT_SECRET!)
        .update(username)
        .digest()
        .subarray(0, 16)
        .toString('base64');

    return {
      status: 'ok',
      code: 'SALT_FOUND',
      message: 'Salt retrieved',
      data: { salt },
    };
  }

  async login(dto: UserLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    const valid = safeEqual(user?.authKey ?? 'dummy', dto.authKey) && !!user;

    if (!user || !valid) {
      throw new UnauthorizedException({
        status: 'error',
        code: 'AUTH_INVALID',
        message: 'Invalid credentials',
      });
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
    });

    return {
      status: 'ok',
      code: 'LOGIN_OK',
      message: 'Authenticated',
      data: {
        name: user.name,
        username: user.username,
        salt: user.salt,
        publicKey: user.publicKey,
        encryptedPrivateKey: user.encryptedPrivateKey,
        accessToken,
      },
    };
  }

  async getUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        salt: false,
        publicKey: true,
        encryptedPrivateKey: false,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      status: 'ok',
      code: 'USER_FOUND',
      message: 'User retrieved',
      data: user,
    };
  }
}