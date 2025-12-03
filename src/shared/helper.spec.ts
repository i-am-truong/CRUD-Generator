import { Prisma } from '@prisma/client';
import { isUnqueConstraintPrismaError, isNotFoundPrismaError } from './helper';

describe('Helper Functions', () => {
  describe('isUnqueConstraintPrismaError', () => {
    it('should return true for P2002 Prisma error', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        }
      );

      const result = isUnqueConstraintPrismaError(error);

      expect(result).toBe(true);
    });

    it('should return false for non-P2002 Prisma error', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        }
      );

      const result = isUnqueConstraintPrismaError(error);

      expect(result).toBe(false);
    });

    it('should return false for non-Prisma error', () => {
      const error = new Error('Generic error');

      const result = isUnqueConstraintPrismaError(error);

      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const result = isUnqueConstraintPrismaError(null);

      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = isUnqueConstraintPrismaError(undefined);

      expect(result).toBe(false);
    });

    it('should return false for plain object with P2002 code', () => {
      const error = { code: 'P2002', message: 'Unique constraint failed' };

      const result = isUnqueConstraintPrismaError(error);

      expect(result).toBe(false);
    });

    it('should return false for other Prisma error codes', () => {
      const errorCodes = ['P2001', 'P2003', 'P2015', 'P2024'];

      errorCodes.forEach(code => {
        const error = new Prisma.PrismaClientKnownRequestError(
          'Some error',
          { code, clientVersion: '5.0.0' }
        );
        expect(isUnqueConstraintPrismaError(error)).toBe(false);
      });
    });

    it('should handle PrismaClientUnknownRequestError', () => {
      const error = new Prisma.PrismaClientUnknownRequestError(
        'Unknown error',
        { clientVersion: '5.0.0' }
      );

      const result = isUnqueConstraintPrismaError(error);

      expect(result).toBe(false);
    });

    it('should handle PrismaClientValidationError', () => {
      const error = new Prisma.PrismaClientValidationError(
        'Validation failed',
        { clientVersion: '5.0.0' }
      );

      const result = isUnqueConstraintPrismaError(error);

      expect(result).toBe(false);
    });

    it('should be type-safe with correct return type', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' }
      );

      if (isUnqueConstraintPrismaError(error)) {
        // TypeScript should recognize error as PrismaClientKnownRequestError
        expect(error.code).toBe('P2002');
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      }
    });

    it('should handle error with additional metadata', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on email',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        }
      );

      const result = isUnqueConstraintPrismaError(error);

      expect(result).toBe(true);
      expect(error.meta).toEqual({ target: ['email'] });
    });
  });

  describe('isNotFoundPrismaError', () => {
    it('should return true for P2025 Prisma error', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        }
      );

      const result = isNotFoundPrismaError(error);

      expect(result).toBe(true);
    });

    it('should return false for non-P2025 Prisma error', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        }
      );

      const result = isNotFoundPrismaError(error);

      expect(result).toBe(false);
    });

    it('should return false for non-Prisma error', () => {
      const error = new Error('Generic error');

      const result = isNotFoundPrismaError(error);

      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const result = isNotFoundPrismaError(null);

      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = isNotFoundPrismaError(undefined);

      expect(result).toBe(false);
    });

    it('should return false for plain object with P2025 code', () => {
      const error = { code: 'P2025', message: 'Record not found' };

      const result = isNotFoundPrismaError(error);

      expect(result).toBe(false);
    });

    it('should return false for other Prisma error codes', () => {
      const errorCodes = ['P2001', 'P2003', 'P2015', 'P2024'];

      errorCodes.forEach(code => {
        const error = new Prisma.PrismaClientKnownRequestError(
          'Some error',
          { code, clientVersion: '5.0.0' }
        );
        expect(isNotFoundPrismaError(error)).toBe(false);
      });
    });

    it('should handle different not-found scenarios', () => {
      const scenarios = [
        'Record to delete does not exist',
        'Record to update not found',
        'An operation failed because it depends on one or more records that were required but not found',
      ];

      scenarios.forEach(message => {
        const error = new Prisma.PrismaClientKnownRequestError(
          message,
          { code: 'P2025', clientVersion: '5.0.0' }
        );
        expect(isNotFoundPrismaError(error)).toBe(true);
      });
    });

    it('should be type-safe with correct return type', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );

      if (isNotFoundPrismaError(error)) {
        // TypeScript should recognize error as PrismaClientKnownRequestError
        expect(error.code).toBe('P2025');
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      }
    });

    it('should handle error with meta information', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record to delete does not exist',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
          meta: { cause: 'Record to delete does not exist.' },
        }
      );

      const result = isNotFoundPrismaError(error);

      expect(result).toBe(true);
      expect(error.meta).toBeDefined();
    });

    it('should handle PrismaClientUnknownRequestError', () => {
      const error = new Prisma.PrismaClientUnknownRequestError(
        'Unknown error',
        { clientVersion: '5.0.0' }
      );

      const result = isNotFoundPrismaError(error);

      expect(result).toBe(false);
    });
  });

  describe('type predicates integration', () => {
    it('should correctly distinguish between different error types', () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' }
      );

      const notFoundError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );

      expect(isUnqueConstraintPrismaError(uniqueError)).toBe(true);
      expect(isNotFoundPrismaError(uniqueError)).toBe(false);

      expect(isUnqueConstraintPrismaError(notFoundError)).toBe(false);
      expect(isNotFoundPrismaError(notFoundError)).toBe(true);
    });

    it('should work in conditional branches', () => {
      const errors = [
        new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '5.0.0' }),
        new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '5.0.0' }),
        new Error('Generic'),
      ];

      const results = errors.map(error => {
        if (isUnqueConstraintPrismaError(error)) {
          return 'unique-constraint';
        } else if (isNotFoundPrismaError(error)) {
          return 'not-found';
        } else {
          return 'other';
        }
      });

      expect(results).toEqual(['unique-constraint', 'not-found', 'other']);
    });

    it('should handle multiple error checks in try-catch blocks', () => {
      const handleError = (error: any): string => {
        if (isUnqueConstraintPrismaError(error)) {
          return 'Duplicate entry detected';
        }
        if (isNotFoundPrismaError(error)) {
          return 'Resource not found';
        }
        return 'Unknown error';
      };

      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique',
        { code: 'P2002', clientVersion: '5.0.0' }
      );
      const notFoundError = new Prisma.PrismaClientKnownRequestError(
        'Not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );
      const genericError = new Error('Generic');

      expect(handleError(uniqueError)).toBe('Duplicate entry detected');
      expect(handleError(notFoundError)).toBe('Resource not found');
      expect(handleError(genericError)).toBe('Unknown error');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle errors with missing properties gracefully', () => {
      const incompleteError = { code: 'P2002' } as any;

      expect(isUnqueConstraintPrismaError(incompleteError)).toBe(false);
      expect(isNotFoundPrismaError(incompleteError)).toBe(false);
    });

    it('should handle errors with wrong code type', () => {
      const wrongTypeError = {
        code: 2002,
        message: 'Error',
      } as any;

      expect(isUnqueConstraintPrismaError(wrongTypeError)).toBe(false);
    });

    it('should handle string inputs', () => {
      expect(isUnqueConstraintPrismaError('P2002')).toBe(false);
      expect(isNotFoundPrismaError('P2025')).toBe(false);
    });

    it('should handle number inputs', () => {
      expect(isUnqueConstraintPrismaError(2002)).toBe(false);
      expect(isNotFoundPrismaError(2025)).toBe(false);
    });

    it('should handle boolean inputs', () => {
      expect(isUnqueConstraintPrismaError(true)).toBe(false);
      expect(isNotFoundPrismaError(false)).toBe(false);
    });

    it('should handle array inputs', () => {
      expect(isUnqueConstraintPrismaError([])).toBe(false);
      expect(isNotFoundPrismaError([{ code: 'P2025' }])).toBe(false);
    });
  });
});