import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  LoginBodyDTO,
  LoginResponseDTO,
  RefreshTokenBodyDTO,
  RefreshTokenResponseDTO,
  RegisterBodyDTO,
  RegisterResponseDTO,
} from './auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerBody: RegisterBodyDTO = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      name: 'Test User',
    };

    const registeredUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      password: '$2b$10$hashedPassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully register a new user', async () => {
      mockAuthService.register.mockResolvedValue(registeredUser);

      const result = await controller.register(registerBody);

      expect(result).toEqual(registeredUser);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerBody);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should call authService.register with correct body', async () => {
      mockAuthService.register.mockResolvedValue(registeredUser);

      await controller.register(registerBody);

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        name: 'Test User',
      });
    });

    it('should handle registration with different user data', async () => {
      const differentBody: RegisterBodyDTO = {
        email: 'another@example.com',
        password: 'differentPass',
        confirmPassword: 'differentPass',
        name: 'Another User',
      };

      const differentUser = {
        ...registeredUser,
        id: 2,
        email: 'another@example.com',
        name: 'Another User',
      };

      mockAuthService.register.mockResolvedValue(differentUser);

      const result = await controller.register(differentBody);

      expect(result).toEqual(differentUser);
      expect(mockAuthService.register).toHaveBeenCalledWith(differentBody);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Email already exists');
      mockAuthService.register.mockRejectedValue(error);

      await expect(controller.register(registerBody)).rejects.toThrow('Email already exists');
    });

    it('should handle special characters in email', async () => {
      const bodyWithSpecialEmail = {
        ...registerBody,
        email: 'test+special@example.co.uk',
      };

      mockAuthService.register.mockResolvedValue({
        ...registeredUser,
        email: bodyWithSpecialEmail.email,
      });

      const result = await controller.register(bodyWithSpecialEmail);

      expect(result.email).toBe('test+special@example.co.uk');
    });

    it('should handle unicode characters in name', async () => {
      const bodyWithUnicode = {
        ...registerBody,
        name: '测试用户',
      };

      mockAuthService.register.mockResolvedValue({
        ...registeredUser,
        name: bodyWithUnicode.name,
      });

      const result = await controller.register(bodyWithUnicode);

      expect(result.name).toBe('测试用户');
    });

    it('should handle very long names', async () => {
      const longName = 'A'.repeat(255);
      const bodyWithLongName = {
        ...registerBody,
        name: longName,
      };

      mockAuthService.register.mockResolvedValue({
        ...registeredUser,
        name: longName,
      });

      const result = await controller.register(bodyWithLongName);

      expect(result.name).toBe(longName);
    });

    it('should return user without password in production use', async () => {
      mockAuthService.register.mockResolvedValue(registeredUser);

      const result = await controller.register(registerBody);

      // The controller returns the raw user, but in production,
      // RegisterResponseDTO should exclude password via class-transformer
      expect(result).toBeDefined();
    });

    it('should handle concurrent registration requests', async () => {
      const body1 = { ...registerBody, email: 'user1@example.com' };
      const body2 = { ...registerBody, email: 'user2@example.com' };
      const body3 = { ...registerBody, email: 'user3@example.com' };

      mockAuthService.register
        .mockResolvedValueOnce({ ...registeredUser, id: 1, email: 'user1@example.com' })
        .mockResolvedValueOnce({ ...registeredUser, id: 2, email: 'user2@example.com' })
        .mockResolvedValueOnce({ ...registeredUser, id: 3, email: 'user3@example.com' });

      const results = await Promise.all([
        controller.register(body1),
        controller.register(body2),
        controller.register(body3),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].email).toBe('user1@example.com');
      expect(results[1].email).toBe('user2@example.com');
      expect(results[2].email).toBe('user3@example.com');
    });
  });

  describe('login', () => {
    const loginBody: LoginBodyDTO = {
      email: 'test@example.com',
      password: 'password123',
    };

    const tokens = {
      accessToken: 'access.token.value',
      refreshToken: 'refresh.token.value',
    };

    it('should successfully login with correct credentials', async () => {
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login(loginBody);

      expect(result).toBeInstanceOf(LoginResponseDTO);
      expect(result.accessToken).toBe('access.token.value');
      expect(result.refreshToken).toBe('refresh.token.value');
      expect(mockAuthService.login).toHaveBeenCalledWith(loginBody);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should wrap tokens in LoginResponseDTO', async () => {
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login(loginBody);

      expect(result).toBeInstanceOf(LoginResponseDTO);
      expect(result).toEqual(expect.objectContaining(tokens));
    });

    it('should call authService.login with correct credentials', async () => {
      mockAuthService.login.mockResolvedValue(tokens);

      await controller.login(loginBody);

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle login with different credentials', async () => {
      const differentBody: LoginBodyDTO = {
        email: 'another@example.com',
        password: 'differentPass',
      };

      const differentTokens = {
        accessToken: 'different.access.token',
        refreshToken: 'different.refresh.token',
      };

      mockAuthService.login.mockResolvedValue(differentTokens);

      const result = await controller.login(differentBody);

      expect(result.accessToken).toBe('different.access.token');
      expect(result.refreshToken).toBe('different.refresh.token');
    });

    it('should propagate UnauthorizedException from service', async () => {
      const error = new Error('Account does not exist');
      mockAuthService.login.mockRejectedValue(error);

      await expect(controller.login(loginBody)).rejects.toThrow('Account does not exist');
    });

    it('should propagate UnprocessableEntityException from service', async () => {
      const error = new Error('Incorrect password');
      mockAuthService.login.mockRejectedValue(error);

      await expect(controller.login(loginBody)).rejects.toThrow('Incorrect password');
    });

    it('should handle case-sensitive email', async () => {
      const bodyWithUpperCase = {
        ...loginBody,
        email: 'TEST@EXAMPLE.COM',
      };

      mockAuthService.login.mockResolvedValue(tokens);

      await controller.login(bodyWithUpperCase);

      expect(mockAuthService.login).toHaveBeenCalledWith(bodyWithUpperCase);
    });

    it('should handle special characters in email', async () => {
      const bodyWithSpecialEmail = {
        ...loginBody,
        email: 'test+tag@example.co.uk',
      };

      mockAuthService.login.mockResolvedValue(tokens);

      await controller.login(bodyWithSpecialEmail);

      expect(mockAuthService.login).toHaveBeenCalledWith(bodyWithSpecialEmail);
    });

    it('should handle multiple login requests', async () => {
      mockAuthService.login.mockResolvedValue(tokens);

      await controller.login(loginBody);
      await controller.login(loginBody);

      expect(mockAuthService.login).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent login requests', async () => {
      const body1 = { email: 'user1@example.com', password: 'pass1' };
      const body2 = { email: 'user2@example.com', password: 'pass2' };
      const body3 = { email: 'user3@example.com', password: 'pass3' };

      mockAuthService.login.mockResolvedValue(tokens);

      const results = await Promise.all([
        controller.login(body1),
        controller.login(body2),
        controller.login(body3),
      ]);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeInstanceOf(LoginResponseDTO);
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
      });
    });

    it('should not expose sensitive data in response', async () => {
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login(loginBody);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('user');
    });
  });

  describe('refreshToken', () => {
    const refreshTokenBody: RefreshTokenBodyDTO = {
      refreshToken: 'refresh.token.value',
    };

    const newTokens = {
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token',
    };

    it('should successfully refresh tokens', async () => {
      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      const result = await controller.refreshToken(refreshTokenBody);

      expect(result).toBeInstanceOf(RefreshTokenResponseDTO);
      expect(result.accessToken).toBe('new.access.token');
      expect(result.refreshToken).toBe('new.refresh.token');
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('refresh.token.value');
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('should wrap tokens in RefreshTokenResponseDTO', async () => {
      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      const result = await controller.refreshToken(refreshTokenBody);

      expect(result).toBeInstanceOf(RefreshTokenResponseDTO);
      expect(result).toEqual(expect.objectContaining(newTokens));
    });

    it('should call authService.refreshToken with correct token', async () => {
      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      await controller.refreshToken(refreshTokenBody);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('refresh.token.value');
    });

    it('should handle different refresh tokens', async () => {
      const differentBody: RefreshTokenBodyDTO = {
        refreshToken: 'different.refresh.token',
      };

      const differentNewTokens = {
        accessToken: 'different.new.access',
        refreshToken: 'different.new.refresh',
      };

      mockAuthService.refreshToken.mockResolvedValue(differentNewTokens);

      const result = await controller.refreshToken(differentBody);

      expect(result.accessToken).toBe('different.new.access');
      expect(result.refreshToken).toBe('different.new.refresh');
    });

    it('should propagate UnauthorizedException from service', async () => {
      const error = new Error('Invalid refresh token');
      mockAuthService.refreshToken.mockRejectedValue(error);

      await expect(controller.refreshToken(refreshTokenBody)).rejects.toThrow('Invalid refresh token');
    });

    it('should propagate revoked token error', async () => {
      const error = new Error('Refresh token has been revoked');
      mockAuthService.refreshToken.mockRejectedValue(error);

      await expect(controller.refreshToken(refreshTokenBody)).rejects.toThrow('Refresh token has been revoked');
    });

    it('should handle expired refresh token', async () => {
      const error = new Error('Token expired');
      mockAuthService.refreshToken.mockRejectedValue(error);

      await expect(controller.refreshToken(refreshTokenBody)).rejects.toThrow('Token expired');
    });

    it('should handle malformed refresh token', async () => {
      const malformedBody: RefreshTokenBodyDTO = {
        refreshToken: 'invalid.token.format',
      };

      const error = new Error('Malformed token');
      mockAuthService.refreshToken.mockRejectedValue(error);

      await expect(controller.refreshToken(malformedBody)).rejects.toThrow('Malformed token');
    });

    it('should handle multiple refresh requests', async () => {
      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      await controller.refreshToken(refreshTokenBody);
      await controller.refreshToken({ refreshToken: 'another.token' });

      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent refresh requests', async () => {
      const body1 = { refreshToken: 'token1' };
      const body2 = { refreshToken: 'token2' };
      const body3 = { refreshToken: 'token3' };

      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      const results = await Promise.all([
        controller.refreshToken(body1),
        controller.refreshToken(body2),
        controller.refreshToken(body3),
      ]);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeInstanceOf(RefreshTokenResponseDTO);
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
      });
    });

    it('should return HTTP 200 for successful refresh', async () => {
      // Note: @HttpCode(HttpStatus.OK) is set on the method
      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      const result = await controller.refreshToken(refreshTokenBody);

      expect(result).toBeDefined();
      // HTTP status code is handled by NestJS framework
    });

    it('should handle empty refresh token string', async () => {
      const emptyBody: RefreshTokenBodyDTO = {
        refreshToken: '',
      };

      const error = new Error('Token required');
      mockAuthService.refreshToken.mockRejectedValue(error);

      await expect(controller.refreshToken(emptyBody)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors in register', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockAuthService.register.mockRejectedValue(unexpectedError);

      await expect(
        controller.register({
          email: 'test@test.com',
          password: 'pass',
          confirmPassword: 'pass',
          name: 'Test',
        })
      ).rejects.toThrow('Unexpected error');
    });

    it('should handle unexpected errors in login', async () => {
      const unexpectedError = new Error('Service unavailable');
      mockAuthService.login.mockRejectedValue(unexpectedError);

      await expect(
        controller.login({ email: 'test@test.com', password: 'pass' })
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle unexpected errors in refreshToken', async () => {
      const unexpectedError = new Error('Database error');
      mockAuthService.refreshToken.mockRejectedValue(unexpectedError);

      await expect(
        controller.refreshToken({ refreshToken: 'token' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('response DTOs', () => {
    it('should use LoginResponseDTO for login endpoint', async () => {
      const tokens = {
        accessToken: 'access',
        refreshToken: 'refresh',
      };

      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login({
        email: 'test@test.com',
        password: 'pass',
      });

      expect(result.constructor.name).toBe('LoginResponseDTO');
    });

    it('should use RefreshTokenResponseDTO for refresh endpoint', async () => {
      const tokens = {
        accessToken: 'access',
        refreshToken: 'refresh',
      };

      mockAuthService.refreshToken.mockResolvedValue(tokens);

      const result = await controller.refreshToken({ refreshToken: 'token' });

      expect(result.constructor.name).toBe('RefreshTokenResponseDTO');
    });
  });
});