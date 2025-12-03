import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { envConfig } from '../config';

jest.mock('../config', () => ({
  envConfig: {
    ACCESS_TOKEN_SECRET: 'test-access-secret',
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  },
}));

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signAccessToken', () => {
    it('should sign an access token with correct payload and options', () => {
      const payload = { userId: 123 };
      const expectedToken = 'signed.access.token';

      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = service.signAccessToken(payload);

      expect(result).toBe(expectedToken);
      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        secret: 'test-access-secret',
        expiresIn: '15m',
        algorithm: 'HS256',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
    });

    it('should handle different user IDs', () => {
      const payloads = [{ userId: 1 }, { userId: 999 }, { userId: 123456 }];
      const expectedTokens = ['token1', 'token2', 'token3'];

      payloads.forEach((payload, index) => {
        mockJwtService.sign.mockReturnValueOnce(expectedTokens[index]);
        const result = service.signAccessToken(payload);
        expect(result).toBe(expectedTokens[index]);
      });

      expect(jwtService.sign).toHaveBeenCalledTimes(3);
    });

    it('should use HS256 algorithm', () => {
      const payload = { userId: 1 };
      mockJwtService.sign.mockReturnValue('token');

      service.signAccessToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({ algorithm: 'HS256' })
      );
    });

    it('should use environment config for secret and expiry', () => {
      const payload = { userId: 1 };
      mockJwtService.sign.mockReturnValue('token');

      service.signAccessToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          secret: envConfig.ACCESS_TOKEN_SECRET,
          expiresIn: envConfig.ACCESS_TOKEN_EXPIRES_IN,
        })
      );
    });

    it('should handle edge case userId of 0', () => {
      const payload = { userId: 0 };
      const expectedToken = 'token.for.zero';

      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = service.signAccessToken(payload);

      expect(result).toBe(expectedToken);
      expect(jwtService.sign).toHaveBeenCalledWith(payload, expect.any(Object));
    });

    it('should handle negative userId', () => {
      const payload = { userId: -1 };
      const expectedToken = 'token.negative';

      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = service.signAccessToken(payload);

      expect(result).toBe(expectedToken);
    });
  });

  describe('signRefreshToken', () => {
    it('should sign a refresh token with correct payload and options', () => {
      const payload = { userId: 456 };
      const expectedToken = 'signed.refresh.token';

      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = service.signRefreshToken(payload);

      expect(result).toBe(expectedToken);
      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        secret: 'test-refresh-secret',
        expiresIn: '7d',
        algorithm: 'HS256',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
    });

    it('should use different secret than access token', () => {
      const payload = { userId: 1 };
      mockJwtService.sign.mockReturnValue('token');

      service.signRefreshToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({ secret: 'test-refresh-secret' })
      );
    });

    it('should use longer expiry than access token', () => {
      const payload = { userId: 1 };
      mockJwtService.sign.mockReturnValue('token');

      service.signRefreshToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({ expiresIn: '7d' })
      );
    });

    it('should handle multiple consecutive calls', () => {
      const payloads = [{ userId: 1 }, { userId: 2 }, { userId: 3 }];
      const tokens = ['refresh1', 'refresh2', 'refresh3'];

      payloads.forEach((payload, index) => {
        mockJwtService.sign.mockReturnValueOnce(tokens[index]);
        const result = service.signRefreshToken(payload);
        expect(result).toBe(tokens[index]);
      });

      expect(jwtService.sign).toHaveBeenCalledTimes(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify an access token successfully', async () => {
      const token = 'valid.access.token';
      const expectedPayload = {
        userId: 123,
        exp: Math.floor(Date.now() / 1000) + 900,
        iat: Math.floor(Date.now() / 1000),
      };

      mockJwtService.verifyAsync.mockResolvedValue(expectedPayload);

      const result = await service.verifyAccessToken(token);

      expect(result).toEqual(expectedPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: 'test-access-secret',
        algorithms: ['HS256'],
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid access token', async () => {
      const invalidToken = 'invalid.token';
      const error = new Error('Invalid token');

      mockJwtService.verifyAsync.mockRejectedValue(error);

      await expect(service.verifyAccessToken(invalidToken)).rejects.toThrow('Invalid token');
    });

    it('should reject expired access token', async () => {
      const expiredToken = 'expired.token';
      const error = new Error('Token expired');

      mockJwtService.verifyAsync.mockRejectedValue(error);

      await expect(service.verifyAccessToken(expiredToken)).rejects.toThrow('Token expired');
    });

    it('should verify token with correct algorithm', async () => {
      const token = 'token';
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1, exp: 123, iat: 100 });

      await service.verifyAccessToken(token);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        token,
        expect.objectContaining({ algorithms: ['HS256'] })
      );
    });

    it('should handle malformed tokens', async () => {
      const malformedToken = 'not.a.valid.jwt.token';
      const error = new Error('Malformed token');

      mockJwtService.verifyAsync.mockRejectedValue(error);

      await expect(service.verifyAccessToken(malformedToken)).rejects.toThrow('Malformed token');
    });

    it('should handle empty token', async () => {
      const emptyToken = '';
      const error = new Error('Token required');

      mockJwtService.verifyAsync.mockRejectedValue(error);

      await expect(service.verifyAccessToken(emptyToken)).rejects.toThrow();
    });

    it('should return payload with all required fields', async () => {
      const token = 'valid.token';
      const payload = {
        userId: 999,
        exp: 1234567890,
        iat: 1234567800,
      };

      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyAccessToken(token);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('exp');
      expect(result).toHaveProperty('iat');
      expect(result.userId).toBe(999);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a refresh token successfully', async () => {
      const token = 'valid.refresh.token';
      const expectedPayload = {
        userId: 789,
        exp: Math.floor(Date.now() / 1000) + 604800,
        iat: Math.floor(Date.now() / 1000),
      };

      mockJwtService.verifyAsync.mockResolvedValue(expectedPayload);

      const result = await service.verifyRefreshToken(token);

      expect(result).toEqual(expectedPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: 'test-refresh-secret',
        algorithms: ['HS256'],
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledTimes(1);
    });

    it('should use different secret than access token verification', async () => {
      const token = 'refresh.token';
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1, exp: 123, iat: 100 });

      await service.verifyRefreshToken(token);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        token,
        expect.objectContaining({ secret: 'test-refresh-secret' })
      );
    });

    it('should reject invalid refresh token', async () => {
      const invalidToken = 'invalid.refresh.token';
      const error = new Error('Invalid refresh token');

      mockJwtService.verifyAsync.mockRejectedValue(error);

      await expect(service.verifyRefreshToken(invalidToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = 'expired.refresh.token';
      const error = new Error('Refresh token expired');

      mockJwtService.verifyAsync.mockRejectedValue(error);

      await expect(service.verifyRefreshToken(expiredToken)).rejects.toThrow('Refresh token expired');
    });

    it('should handle token signature mismatch', async () => {
      const tokenWithWrongSignature = 'token.with.wrong.signature';
      const error = new Error('Invalid signature');

      mockJwtService.verifyAsync.mockRejectedValue(error);

      await expect(service.verifyRefreshToken(tokenWithWrongSignature)).rejects.toThrow('Invalid signature');
    });

    it('should verify multiple tokens sequentially', async () => {
      const tokens = ['token1', 'token2', 'token3'];
      const payloads = [
        { userId: 1, exp: 100, iat: 50 },
        { userId: 2, exp: 200, iat: 150 },
        { userId: 3, exp: 300, iat: 250 },
      ];

      tokens.forEach((token, index) => {
        mockJwtService.verifyAsync.mockResolvedValueOnce(payloads[index]);
      });

      for (let i = 0; i < tokens.length; i++) {
        const result = await service.verifyRefreshToken(tokens[i]);
        expect(result).toEqual(payloads[i]);
      }

      expect(jwtService.verifyAsync).toHaveBeenCalledTimes(3);
    });
  });

  describe('token lifecycle integration', () => {
    it('should sign and verify access token in sequence', async () => {
      const payload = { userId: 100 };
      const token = 'access.token';
      const verifiedPayload = {
        userId: 100,
        exp: Math.floor(Date.now() / 1000) + 900,
        iat: Math.floor(Date.now() / 1000),
      };

      mockJwtService.sign.mockReturnValue(token);
      mockJwtService.verifyAsync.mockResolvedValue(verifiedPayload);

      const signedToken = service.signAccessToken(payload);
      const verified = await service.verifyAccessToken(signedToken);

      expect(signedToken).toBe(token);
      expect(verified.userId).toBe(payload.userId);
    });

    it('should sign and verify refresh token in sequence', async () => {
      const payload = { userId: 200 };
      const token = 'refresh.token';
      const verifiedPayload = {
        userId: 200,
        exp: Math.floor(Date.now() / 1000) + 604800,
        iat: Math.floor(Date.now() / 1000),
      };

      mockJwtService.sign.mockReturnValue(token);
      mockJwtService.verifyAsync.mockResolvedValue(verifiedPayload);

      const signedToken = service.signRefreshToken(payload);
      const verified = await service.verifyRefreshToken(signedToken);

      expect(signedToken).toBe(token);
      expect(verified.userId).toBe(payload.userId);
    });

    it('should not verify access token with refresh token secret', async () => {
      const payload = { userId: 1 };
      const accessToken = 'access.token';

      mockJwtService.sign.mockReturnValue(accessToken);
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid secret'));

      service.signAccessToken(payload);
      
      // Attempting to verify with wrong method should fail
      await expect(service.verifyRefreshToken(accessToken)).rejects.toThrow();
    });
  });
});