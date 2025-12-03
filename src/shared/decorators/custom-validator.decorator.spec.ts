import { validate, ValidationError } from 'class-validator';
import { Match } from './custom-validator.decorator';

class TestDTO {
  password: string;

  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;
}

class TestDTODefaultMessage {
  email: string;

  @Match('email')
  confirmEmail: string;
}

class TestDTOMultipleFields {
  field1: string;

  @Match('field1')
  field2: string;

  @Match('field1')
  field3: string;
}

describe('Match Decorator', () => {
  describe('validation success', () => {
    it('should validate successfully when values match', async () => {
      const dto = new TestDTO();
      dto.password = 'password123';
      dto.confirmPassword = 'password123';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should validate empty strings that match', async () => {
      const dto = new TestDTO();
      dto.password = '';
      dto.confirmPassword = '';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should validate with whitespace', async () => {
      const dto = new TestDTO();
      dto.password = '  password  ';
      dto.confirmPassword = '  password  ';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should validate special characters', async () => {
      const dto = new TestDTO();
      dto.password = '!@#$%^&*()_+-={}[]|:;"<>,.?/';
      dto.confirmPassword = '!@#$%^&*()_+-={}[]|:;"<>,.?/';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should validate unicode characters', async () => {
      const dto = new TestDTO();
      dto.password = '密码🔐';
      dto.confirmPassword = '密码🔐';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should validate very long strings', async () => {
      const dto = new TestDTO();
      const longString = 'a'.repeat(10000);
      dto.password = longString;
      dto.confirmPassword = longString;

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should validate numbers as strings', async () => {
      const dto = new TestDTO();
      dto.password = '12345';
      dto.confirmPassword = '12345';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should validate with newlines and tabs', async () => {
      const dto = new TestDTO();
      dto.password = 'password\n\ttest';
      dto.confirmPassword = 'password\n\ttest';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });
  });

  describe('validation failure', () => {
    it('should fail validation when values do not match', async () => {
      const dto = new TestDTO();
      dto.password = 'password123';
      dto.confirmPassword = 'password456';

      const errors = await validate(dto);

      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('confirmPassword');
      expect(errors[0].constraints).toHaveProperty('match');
    });

    it('should use custom error message', async () => {
      const dto = new TestDTO();
      dto.password = 'password123';
      dto.confirmPassword = 'different';

      const errors = await validate(dto);

      expect(errors[0].constraints?.match).toBe('Passwords do not match');
    });

    it('should use default message when not provided', async () => {
      const dto = new TestDTODefaultMessage();
      dto.email = 'test@example.com';
      dto.confirmEmail = 'different@example.com';

      const errors = await validate(dto);

      expect(errors[0].constraints?.match).toBe('confirmEmail must match email');
    });

    it('should fail when one field is undefined', async () => {
      const dto = new TestDTO();
      dto.password = 'password123';
      // confirmPassword is undefined

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when one field is null', async () => {
      const dto = new TestDTO();
      dto.password = 'password123';
      dto.confirmPassword = null as any;

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when original field is undefined', async () => {
      const dto = new TestDTO();
      // password is undefined
      dto.confirmPassword = 'password123';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should be case-sensitive', async () => {
      const dto = new TestDTO();
      dto.password = 'Password123';
      dto.confirmPassword = 'password123';

      const errors = await validate(dto);

      expect(errors.length).toBe(1);
    });

    it('should fail when spaces differ', async () => {
      const dto = new TestDTO();
      dto.password = 'password123';
      dto.confirmPassword = 'password123 ';

      const errors = await validate(dto);

      expect(errors.length).toBe(1);
    });

    it('should fail when one is empty and other is not', async () => {
      const dto = new TestDTO();
      dto.password = '';
      dto.confirmPassword = 'password';

      const errors = await validate(dto);

      expect(errors.length).toBe(1);
    });
  });

  describe('multiple field validation', () => {
    it('should validate multiple fields matching the same source', async () => {
      const dto = new TestDTOMultipleFields();
      dto.field1 = 'value';
      dto.field2 = 'value';
      dto.field3 = 'value';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail all fields that do not match', async () => {
      const dto = new TestDTOMultipleFields();
      dto.field1 = 'value';
      dto.field2 = 'different';
      dto.field3 = 'another';

      const errors = await validate(dto);

      expect(errors.length).toBe(2);
      const properties = errors.map(e => e.property);
      expect(properties).toContain('field2');
      expect(properties).toContain('field3');
    });

    it('should fail only mismatched fields', async () => {
      const dto = new TestDTOMultipleFields();
      dto.field1 = 'value';
      dto.field2 = 'value';
      dto.field3 = 'different';

      const errors = await validate(dto);

      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('field3');
    });
  });

  describe('edge cases', () => {
    it('should handle boolean values converted to strings', async () => {
      class TestBooleanDTO {
        field1: any;
        @Match('field1')
        field2: any;
      }

      const dto = new TestBooleanDTO();
      dto.field1 = 'true';
      dto.field2 = 'true';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should not match boolean true with string "true"', async () => {
      class TestBooleanDTO {
        field1: any;
        @Match('field1')
        field2: any;
      }

      const dto = new TestBooleanDTO();
      dto.field1 = true;
      dto.field2 = 'true';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle numeric strings', async () => {
      class TestNumericDTO {
        field1: any;
        @Match('field1')
        field2: any;
      }

      const dto = new TestNumericDTO();
      dto.field1 = '123';
      dto.field2 = '123';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should not match number with numeric string', async () => {
      class TestNumericDTO {
        field1: any;
        @Match('field1')
        field2: any;
      }

      const dto = new TestNumericDTO();
      dto.field1 = 123;
      dto.field2 = '123';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle objects (should not match)', async () => {
      class TestObjectDTO {
        field1: any;
        @Match('field1')
        field2: any;
      }

      const dto = new TestObjectDTO();
      dto.field1 = { key: 'value' };
      dto.field2 = { key: 'value' };

      const errors = await validate(dto);

      // Objects are different instances, should not match
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle arrays (should not match)', async () => {
      class TestArrayDTO {
        field1: any;
        @Match('field1')
        field2: any;
      }

      const dto = new TestArrayDTO();
      dto.field1 = [1, 2, 3];
      dto.field2 = [1, 2, 3];

      const errors = await validate(dto);

      // Arrays are different instances, should not match
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('decorator behavior', () => {
    it('should register decorator with correct name', async () => {
      const dto = new TestDTO();
      dto.password = 'pass';
      dto.confirmPassword = 'different';

      const errors = await validate(dto);

      expect(errors[0].constraints).toHaveProperty('match');
    });

    it('should include property name in error', async () => {
      const dto = new TestDTO();
      dto.password = 'pass';
      dto.confirmPassword = 'different';

      const errors = await validate(dto);

      expect(errors[0].property).toBe('confirmPassword');
    });

    it('should work with other validators', async () => {
      const { IsString, MinLength } = require('class-validator');

      class CombinedDTO {
        @IsString()
        @MinLength(6)
        password: string;

        @IsString()
        @MinLength(6)
        @Match('password')
        confirmPassword: string;
      }

      const dto = new CombinedDTO();
      dto.password = 'short';
      dto.confirmPassword = 'short';

      const errors = await validate(dto);

      // Should have errors for minLength, but not for match
      expect(errors.length).toBeGreaterThan(0);
      const matchError = errors.find(e => e.property === 'confirmPassword' && e.constraints?.match);
      expect(matchError).toBeUndefined();
    });

    it('should validate when used multiple times on same class', async () => {
      class MultiMatchDTO {
        email: string;
        @Match('email')
        confirmEmail: string;

        password: string;
        @Match('password')
        confirmPassword: string;
      }

      const dto = new MultiMatchDTO();
      dto.email = 'test@example.com';
      dto.confirmEmail = 'test@example.com';
      dto.password = 'password123';
      dto.confirmPassword = 'password123';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });
  });

  describe('error messages', () => {
    it('should allow customization through validation options', async () => {
      class CustomMessageDTO {
        field1: string;
        @Match('field1', { message: 'Custom error message' })
        field2: string;
      }

      const dto = new CustomMessageDTO();
      dto.field1 = 'value1';
      dto.field2 = 'value2';

      const errors = await validate(dto);

      expect(errors[0].constraints?.match).toBe('Custom error message');
    });

    it('should include both property names in default message', async () => {
      const dto = new TestDTODefaultMessage();
      dto.email = 'test@example.com';
      dto.confirmEmail = 'different@example.com';

      const errors = await validate(dto);

      expect(errors[0].constraints?.match).toContain('confirmEmail');
      expect(errors[0].constraints?.match).toContain('email');
    });
  });
});