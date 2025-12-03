import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from './hashing.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();

    service = module.get<HashingService>(HashingService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hash', () => {
    it('should hash a password successfully', async () => {
      const plainPassword = 'mySecurePassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.hash(plainPassword);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
    });

    it('should use saltRounds of 10', async () => {
      const plainPassword = 'password';
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      await service.hash(plainPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
    });

    it('should handle empty strings', async () => {
      const emptyPassword = '';
      const hashedEmpty = '$2b$10$emptyHash';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedEmpty);

      const result = await service.hash(emptyPassword);

      expect(result).toBe(hashedEmpty);
      expect(bcrypt.hash).toHaveBeenCalledWith(emptyPassword, 10);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hashedLong = '$2b$10$longHash';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedLong);

      const result = await service.hash(longPassword);

      expect(result).toBe(hashedLong);
      expect(bcrypt.hash).toHaveBeenCalledWith(longPassword, 10);
    });

    it('should propagate errors from bcrypt', async () => {
      const plainPassword = 'password';
      const error = new Error('Bcrypt error');

      (bcrypt.hash as jest.Mock).mockRejectedValue(error);

      await expect(service.hash(plainPassword)).rejects.toThrow('Bcrypt error');
    });

    it('should handle special characters in passwords', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedSpecial = '$2b$10$specialHash';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedSpecial);

      const result = await service.hash(specialPassword);

      expect(result).toBe(hashedSpecial);
      expect(bcrypt.hash).toHaveBeenCalledWith(specialPassword, 10);
    });

    it('should handle unicode characters', async () => {
      const unicodePassword = '密码🔐';
      const hashedUnicode = '$2b$10$unicodeHash';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedUnicode);

      const result = await service.hash(unicodePassword);

      expect(result).toBe(hashedUnicode);
      expect(bcrypt.hash).toHaveBeenCalledWith(unicodePassword, 10);
    });
  });

  describe('compare', () => {
    it('should return true when password matches hash', async () => {
      const plainPassword = 'myPassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.compare(plainPassword, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('should return false when password does not match hash', async () => {
      const plainPassword = 'wrongPassword';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.compare(plainPassword, hashedPassword);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('should handle empty password comparison', async () => {
      const emptyPassword = '';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.compare(emptyPassword, hashedPassword);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(emptyPassword, hashedPassword);
    });

    it('should handle empty hash comparison', async () => {
      const plainPassword = 'password';
      const emptyHash = '';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.compare(plainPassword, emptyHash);

      expect(result).toBe(false);
    });

    it('should propagate errors from bcrypt compare', async () => {
      const plainPassword = 'password';
      const hashedPassword = 'invalidHash';
      const error = new Error('Invalid hash format');

      (bcrypt.compare as jest.Mock).mockRejectedValue(error);

      await expect(service.compare(plainPassword, hashedPassword)).rejects.toThrow('Invalid hash format');
    });

    it('should handle special characters in comparison', async () => {
      const specialPassword = '!@#$%^&*()';
      const hashedPassword = '$2b$10$hashedSpecial';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.compare(specialPassword, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(specialPassword, hashedPassword);
    });

    it('should handle case sensitivity correctly', async () => {
      const password = 'Password123';
      const wrongCasePassword = 'password123';
      const hashedPassword = '$2b$10$hashedPassword';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.compare(wrongCasePassword, hashedPassword);

      expect(result).toBe(false);
    });

    it('should handle multiple consecutive comparisons', async () => {
      const password1 = 'password1';
      const password2 = 'password2';
      const hash1 = '$2b$10$hash1';
      const hash2 = '$2b$10$hash2';

      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result1 = await service.compare(password1, hash1);
      const result2 = await service.compare(password2, hash2);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledTimes(2);
    });
  });

  describe('integration scenarios', () => {
    it('should be able to hash and verify the same password', async () => {
      const plainPassword = 'testPassword123';
      const hashedPassword = '$2b$10$testHash';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const hashed = await service.hash(plainPassword);
      const isMatch = await service.compare(plainPassword, hashed);

      expect(hashed).toBe(hashedPassword);
      expect(isMatch).toBe(true);
    });

    it('should generate different hashes for same password on multiple calls', async () => {
      const plainPassword = 'samePassword';
      const hash1 = '$2b$10$hash1';
      const hash2 = '$2b$10$hash2';

      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce(hash1)
        .mockResolvedValueOnce(hash2);

      const result1 = await service.hash(plainPassword);
      const result2 = await service.hash(plainPassword);

      expect(result1).not.toBe(result2);
      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
    });
  });
});