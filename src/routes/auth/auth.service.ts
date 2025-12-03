import { ConflictException, Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { HashingService } from 'src/shared/services/hashing.service'
import { PrismaService } from 'src/shared/services/prisma.service'
import { LoginBodyDTO } from './auth.dto'
import { TokenService } from 'src/shared/services/token.service'
import { isNotFoundPrismaError, isUnqueConstraintPrismaError } from 'src/shared/helper'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async register(body: any) {
    try {
      const hashedPassword = await this.hashingService.hash(body.password)
      const user = await this.prismaService.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          name: body.name,
        },
      })
      return user
    } catch (error) {
      if (isUnqueConstraintPrismaError(error)) {
        throw new ConflictException('Email already exists')
      }
      throw error
    }
  }

  async login(body: LoginBodyDTO) {
    const user = await this.prismaService.user.findUnique({
      where: { email: body.email },
    })
    if (!user) {
      throw new UnauthorizedException('Account does not exist')
    }

    const isPasswordMatching = await this.hashingService.compare(body.password, user.password)
    if (!isPasswordMatching) {
      throw new UnprocessableEntityException([
        {
          field: 'password',
          message: 'Incorrect password',
        },
      ])
    }
    const tokens = await this.generateTokens({ userId: user.id })
    return tokens
  }

  async generateTokens(payload: { userId: number }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    ])
    const decodeRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken)
    await this.prismaService.refreshToken.create({
      data: {
        token: refreshToken,
        userId: payload.userId,
        expiresAt: new Date(decodeRefreshToken.exp * 1000),
      },
    })
    return { accessToken, refreshToken }
  }

  async refreshToken(refreshToken: string) {
    try {
      // Check if the refresh token is valid
      const { userId } = await this.tokenService.verifyRefreshToken(refreshToken)
      // Check if the refresh token exists in DB
      await this.prismaService.refreshToken.findUniqueOrThrow({
        where: {
          token: refreshToken,
        },
      })
      // Delete the used refresh token
      await this.prismaService.refreshToken.delete({
        where: {
          token: refreshToken,
        },
      })
      // Generate new tokens
      return await this.generateTokens({ userId })
    } catch (error) {
      // In case of already refresh toke, let it will announce for user
      // that refresh token of user is stealed
      if (isNotFoundPrismaError(error)) {
        throw new UnauthorizedException('Refresh token has been revoked')
      }
      throw new UnauthorizedException()
    }
  }
}
