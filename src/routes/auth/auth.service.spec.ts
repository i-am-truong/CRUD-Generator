import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HashingService } from '../../shared/services/hashing.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { TokenService } from '../../shared/services/token.service';
import { Prisma } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let hashingService: HashingService;
  let prismaService: PrismaService;
  let tokenService: TokenService;

  const mockHashingService = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockTokenService = {
    signAccessToken: jest.fn(),
    signRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HashingService,
          useValue: mockHashingService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    hashingService = module.get<HashingService>(HashingService);
    prismaService = module.get<PrismaService>(PrismaService);
    tokenService = module.get<TokenService>(TokenService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerBody = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    const hashedPassword = '$2b$10$hashedPassword';
    const createdUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully register a new user', async () => {
      mockHashingService.hash.mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.register(registerBody);

      expect(result).toEqual(createdUser);
      expect(mockHashingService.hash).toHaveBeenCalledWith('password123');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          name: 'Test User',
        },
      });
    });

    it('should hash the password before creating user', async () => {
      mockHashingService.hash.mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      await service.register(registerBody);

      expect(mockHashingService.hash).toHaveBeenCalledWith(registerBody.password);
      expect(mockHashingService.hash).toHaveBeenCalledBefore(mockPrismaService.user.create as jest.Mock);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockHashingService.hash.mockResolvedValue(hashedPassword);
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on email',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        }
      );
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.register(registerBody)).rejects.toThrow(ConflictException);
      await expect(service.register(registerBody)).rejects.toThrow('Email already exists');
    });

    it('should propagate non-unique constraint errors', async () => {
      mockHashingService.hash.mockResolvedValue(hashedPassword);
      const genericError = new Error('Database connection failed');
      mockPrismaService.user.create.mockRejectedValue(genericError);

      await expect(service.register(registerBody)).rejects.toThrow('Database connection failed');
    });

    it('should handle different user data', async () => {
      const differentBody = {
        email: 'another@example.com',
        password: 'differentPass',
        name: 'Another User',
      };
      const differentHash = '$2b$10$differentHash';
      const differentUser = {
        id: 2,
        email: differentBody.email,
        name: differentBody.name,
        password: differentHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHashingService.hash.mockResolvedValue(differentHash);
      mockPrismaService.user.create.mockResolvedValue(differentUser);

      const result = await service.register(differentBody);

      expect(result).toEqual(differentUser);
      expect(mockHashingService.hash).toHaveBeenCalledWith('differentPass');
    });

    it('should handle special characters in email', async () => {
      const bodyWithSpecialEmail = {
        ...registerBody,
        email: 'test+special@example.co.uk',
      };

      mockHashingService.hash.mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue({
        ...createdUser,
        email: bodyWithSpecialEmail.email,
      });

      const result = await service.register(bodyWithSpecialEmail);

      expect(result.email).toBe('test+special@example.co.uk');
    });

    it('should handle unicode characters in name', async () => {
      const bodyWithUnicode = {
        ...registerBody,
        name: '测试用户',
      };

      mockHashingService.hash.mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue({
        ...createdUser,
        name: bodyWithUnicode.name,
      });

      const result = await service.register(bodyWithUnicode);

      expect(result.name).toBe('测试用户');
    });

    it('should handle empty name', async () => {
      const bodyWithEmptyName = {
        ...registerBody,
        name: '',
      };

      mockHashingService.hash.mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue({
        ...createdUser,
        name: '',
      });

      const result = await service.register(bodyWithEmptyName);

      expect(result.name).toBe('');
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const bodyWithLongPassword = {
        ...registerBody,
        password: longPassword,
      };

      mockHashingService.hash.mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      await service.register(bodyWithLongPassword);

      expect(mockHashingService.hash).toHaveBeenCalledWith(longPassword);
    });
  });

  describe('login', () => {
    const loginBody = {
      email: 'test@example.com',
      password: 'password123',
    };

    const existingUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      password: '$2b$10$hashedPassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tokens = {
      accessToken: 'access.token.value',
      refreshToken: 'refresh.token.value',
    };

    it('should successfully login with correct credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockHashingService.compare.mockResolvedValue(true);
      jest.spyOn(service, 'generateTokens').mockResolvedValue(tokens);

      const result = await service.login(loginBody);

      expect(result).toEqual(tokens);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockHashingService.compare).toHaveBeenCalledWith('password123', existingUser.password);
      expect(service.generateTokens).toHaveBeenCalledWith({ userId: 1 });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginBody)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginBody)).rejects.toThrow('Account does not exist');
    });

    it('should not call password compare when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginBody)).rejects.toThrow(UnauthorizedException);
      expect(mockHashingService.compare).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException when password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockHashingService.compare.mockResolvedValue(false);

      await expect(service.login(loginBody)).rejects.toThrow(UnprocessableEntityException);
    });

    it('should provide field-specific error for incorrect password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockHashingService.compare.mockResolvedValue(false);

      try {
        await service.login(loginBody);
        fail('Should have thrown an exception');
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect(error.getResponse()).toEqual([
          {
            field: 'password',
            message: 'Incorrect password',
          },
        ]);
      }
    });

    it('should handle case-sensitive email lookup', async () => {
      const bodyWithUppercaseEmail = {
        ...loginBody,
        email: 'TEST@EXAMPLE.COM',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(bodyWithUppercaseEmail)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'TEST@EXAMPLE.COM' },
      });
    });

    it('should generate tokens only after successful password verification', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockHashingService.compare.mockResolvedValue(true);
      const generateTokensSpy = jest.spyOn(service, 'generateTokens').mockResolvedValue(tokens);

      await service.login(loginBody);

      expect(generateTokensSpy).toHaveBeenCalledAfter(mockHashingService.compare as jest.Mock);
    });

    it('should handle multiple login attempts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockHashingService.compare.mockResolvedValue(true);
      jest.spyOn(service, 'generateTokens').mockResolvedValue(tokens);

      await service.login(loginBody);
      await service.login(loginBody);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(2);
      expect(mockHashingService.compare).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors during user lookup', async () => {
      const dbError = new Error('Database connection failed');
      mockPrismaService.user.findUnique.mockRejectedValue(dbError);

      await expect(service.login(loginBody)).rejects.toThrow('Database connection failed');
    });

    it('should handle errors during password comparison', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      const compareError = new Error('Bcrypt error');
      mockHashingService.compare.mockRejectedValue(compareError);

      await expect(service.login(loginBody)).rejects.toThrow('Bcrypt error');
    });
  });

  describe('generateTokens', () => {
    const payload = { userId: 1 };
    const accessToken = 'access.token.value';
    const refreshToken = 'refresh.token.value';
    const decodedRefreshToken = {
      userId: 1,
      exp: Math.floor(Date.now() / 1000) + 604800,
      iat: Math.floor(Date.now() / 1000),
    };

    it('should generate both access and refresh tokens', async () => {
      mockTokenService.signAccessToken.mockReturnValue(accessToken);
      mockTokenService.signRefreshToken.mockReturnValue(refreshToken);
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedRefreshToken);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.generateTokens(payload);

      expect(result).toEqual({ accessToken, refreshToken });
      expect(mockTokenService.signAccessToken).toHaveBeenCalledWith(payload);
      expect(mockTokenService.signRefreshToken).toHaveBeenCalledWith(payload);
    });

    it('should generate tokens in parallel', async () => {
      mockTokenService.signAccessToken.mockReturnValue(accessToken);
      mockTokenService.signRefreshToken.mockReturnValue(refreshToken);
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedRefreshToken);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.generateTokens(payload);

      expect(mockTokenService.signAccessToken).toHaveBeenCalled();
      expect(mockTokenService.signRefreshToken).toHaveBeenCalled();
    });

    it('should store refresh token in database', async () => {
      mockTokenService.signAccessToken.mockReturnValue(accessToken);
      mockTokenService.signRefreshToken.mockReturnValue(refreshToken);
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedRefreshToken);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.generateTokens(payload);

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: refreshToken,
          userId: payload.userId,
          expiresAt: new Date(decodedRefreshToken.exp * 1000),
        },
      });
    });

    it('should verify refresh token before storing', async () => {
      mockTokenService.signAccessToken.mockReturnValue(accessToken);
      mockTokenService.signRefreshToken.mockReturnValue(refreshToken);
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedRefreshToken);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.generateTokens(payload);

      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledBefore(mockPrismaService.refreshToken.create as jest.Mock);
    });

    it('should convert exp timestamp to Date object', async () => {
      mockTokenService.signAccessToken.mockReturnValue(accessToken);
      mockTokenService.signRefreshToken.mockReturnValue(refreshToken);
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedRefreshToken);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.generateTokens(payload);

      const createCall = mockPrismaService.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.expiresAt).toBeInstanceOf(Date);
      expect(createCall.data.expiresAt.getTime()).toBe(decodedRefreshToken.exp * 1000);
    });

    it('should handle different user IDs', async () => {
      const payloads = [{ userId: 1 }, { userId: 999 }, { userId: 12345 }];

      for (const testPayload of payloads) {
        mockTokenService.signAccessToken.mockReturnValue(accessToken);
        mockTokenService.signRefreshToken.mockReturnValue(refreshToken);
        mockTokenService.verifyRefreshToken.mockResolvedValue({
          ...decodedRefreshToken,
          userId: testPayload.userId,
        });
        mockPrismaService.refreshToken.create.mockResolvedValue({});

        await service.generateTokens(testPayload);

        expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: testPayload.userId,
            }),
          })
        );
      }
    });

    it('should handle token generation errors', async () => {
      const error = new Error('Token generation failed');
      mockTokenService.signAccessToken.mockImplementation(() => {
        throw error;
      });

      await expect(service.generateTokens(payload)).rejects.toThrow('Token generation failed');
    });

    it('should handle database errors when storing refresh token', async () => {
      mockTokenService.signAccessToken.mockReturnValue(accessToken);
      mockTokenService.signRefreshToken.mockReturnValue(refreshToken);
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedRefreshToken);
      const dbError = new Error('Database error');
      mockPrismaService.refreshToken.create.mockRejectedValue(dbError);

      await expect(service.generateTokens(payload)).rejects.toThrow('Database error');
    });
  });

  describe('refreshToken', () => {
    const refreshTokenValue = 'refresh.token.value';
    const decodedToken = {
      userId: 1,
      exp: Math.floor(Date.now() / 1000) + 604800,
      iat: Math.floor(Date.now() / 1000),
    };
    const newTokens = {
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token',
    };
    const storedRefreshToken = {
      token: refreshTokenValue,
      userId: 1,
      expiresAt: new Date(decodedToken.exp * 1000),
      createdAt: new Date(),
    };

    it('should successfully refresh tokens with valid refresh token', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedToken);
      mockPrismaService.refreshToken.findUniqueOrThrow.mockResolvedValue(storedRefreshToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(storedRefreshToken);
      jest.spyOn(service, 'generateTokens').mockResolvedValue(newTokens);

      const result = await service.refreshToken(refreshTokenValue);

      expect(result).toEqual(newTokens);
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(refreshTokenValue);
      expect(mockPrismaService.refreshToken.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { token: refreshTokenValue },
      });
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: refreshTokenValue },
      });
      expect(service.generateTokens).toHaveBeenCalledWith({ userId: 1 });
    });

    it('should verify token before checking database', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedToken);
      mockPrismaService.refreshToken.findUniqueOrThrow.mockResolvedValue(storedRefreshToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(storedRefreshToken);
      jest.spyOn(service, 'generateTokens').mockResolvedValue(newTokens);

      await service.refreshToken(refreshTokenValue);

      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledBefore(mockPrismaService.refreshToken.findUniqueOrThrow as jest.Mock);
    });

    it('should delete old refresh token before generating new ones', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedToken);
      mockPrismaService.refreshToken.findUniqueOrThrow.mockResolvedValue(storedRefreshToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(storedRefreshToken);
      const generateTokensSpy = jest.spyOn(service, 'generateTokens').mockResolvedValue(newTokens);

      await service.refreshToken(refreshTokenValue);

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledBefore(generateTokensSpy as jest.Mock);
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      const error = new Error('Invalid token');
      mockTokenService.verifyRefreshToken.mockRejectedValue(error);

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is not found in database', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedToken);
      const notFoundError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );
      mockPrismaService.refreshToken.findUniqueOrThrow.mockRejectedValue(notFoundError);

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow('Refresh token has been revoked');
    });

    it('should handle token already used (not in database)', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedToken);
      const notFoundError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );
      mockPrismaService.refreshToken.findUniqueOrThrow.mockRejectedValue(notFoundError);

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow('Refresh token has been revoked');
    });

    it('should propagate non-P2025 Prisma errors as UnauthorizedException', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedToken);
      const otherPrismaError = new Prisma.PrismaClientKnownRequestError(
        'Some other error',
        { code: 'P2001', clientVersion: '5.0.0' }
      );
      mockPrismaService.refreshToken.findUniqueOrThrow.mockRejectedValue(otherPrismaError);

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle expired refresh token', async () => {
      const expiredError = new Error('Token expired');
      mockTokenService.verifyRefreshToken.mockRejectedValue(expiredError);

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.refreshToken.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('should handle malformed refresh token', async () => {
      const malformedError = new Error('Malformed token');
      mockTokenService.verifyRefreshToken.mockRejectedValue(malformedError);

      await expect(service.refreshToken('invalid.token')).rejects.toThrow(UnauthorizedException);
    });

    it('should handle database errors during token deletion', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedToken);
      mockPrismaService.refreshToken.findUniqueOrThrow.mockResolvedValue(storedRefreshToken);
      const deleteError = new Error('Database delete failed');
      mockPrismaService.refreshToken.delete.mockRejectedValue(deleteError);

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow('Database delete failed');
    });

    it('should handle multiple refresh token attempts', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedToken);
      mockPrismaService.refreshToken.findUniqueOrThrow.mockResolvedValue(storedRefreshToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(storedRefreshToken);
      jest.spyOn(service, 'generateTokens').mockResolvedValue(newTokens);

      await service.refreshToken(refreshTokenValue);
      await service.refreshToken('another.refresh.token');

      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent refresh token requests', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(decodedToken);
      mockPrismaService.refreshToken.findUniqueOrThrow.mockResolvedValue(storedRefreshToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(storedRefreshToken);
      jest.spyOn(service, 'generateTokens').mockResolvedValue(newTokens);

      const promises = [
        service.refreshToken(refreshTokenValue),
        service.refreshToken('token2'),
        service.refreshToken('token3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(newTokens);
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle unexpected errors in register', async () => {
      const unexpectedError = new TypeError('Unexpected error');
      mockHashingService.hash.mockRejectedValue(unexpectedError);

      await expect(service.register({ email: 'test@test.com', password: 'pass', name: 'Test' })).rejects.toThrow(TypeError);
    });

    it('should handle unexpected errors in login', async () => {
      const unexpectedError = new ReferenceError('Undefined reference');
      mockPrismaService.user.findUnique.mockRejectedValue(unexpectedError);

      await expect(service.login({ email: 'test@test.com', password: 'pass' })).rejects.toThrow(ReferenceError);
    });
  });
});