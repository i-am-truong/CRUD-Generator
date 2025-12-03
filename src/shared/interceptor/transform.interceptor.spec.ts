import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockResponse: any;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    
    mockResponse = {
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should transform response to include data and statusCode', (done) => {
      const testData = { id: 1, name: 'Test' };
      mockCallHandler.handle.mockReturnValue(of(testData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: testData,
          statusCode: 200,
        });
        done();
      });
    });

    it('should include the correct status code from response', (done) => {
      mockResponse.statusCode = 201;
      const testData = { message: 'Created' };
      mockCallHandler.handle.mockReturnValue(of(testData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result.statusCode).toBe(201);
        expect(result.data).toEqual(testData);
        done();
      });
    });

    it('should handle string data', (done) => {
      const testString = 'Hello World';
      mockCallHandler.handle.mockReturnValue(of(testString));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: testString,
          statusCode: 200,
        });
        done();
      });
    });

    it('should handle number data', (done) => {
      const testNumber = 42;
      mockCallHandler.handle.mockReturnValue(of(testNumber));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: testNumber,
          statusCode: 200,
        });
        done();
      });
    });

    it('should handle boolean data', (done) => {
      const testBoolean = true;
      mockCallHandler.handle.mockReturnValue(of(testBoolean));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: testBoolean,
          statusCode: 200,
        });
        done();
      });
    });

    it('should handle array data', (done) => {
      const testArray = [1, 2, 3, 4, 5];
      mockCallHandler.handle.mockReturnValue(of(testArray));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: testArray,
          statusCode: 200,
        });
        done();
      });
    });

    it('should handle null data', (done) => {
      mockCallHandler.handle.mockReturnValue(of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: null,
          statusCode: 200,
        });
        done();
      });
    });

    it('should handle undefined data', (done) => {
      mockCallHandler.handle.mockReturnValue(of(undefined));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: undefined,
          statusCode: 200,
        });
        done();
      });
    });

    it('should handle empty object', (done) => {
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: {},
          statusCode: 200,
        });
        done();
      });
    });

    it('should handle empty array', (done) => {
      mockCallHandler.handle.mockReturnValue(of([]));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: [],
          statusCode: 200,
        });
        done();
      });
    });

    it('should work with different HTTP status codes', (done) => {
      const statusCodes = [200, 201, 202, 204, 304];
      let completed = 0;

      statusCodes.forEach((code) => {
        mockResponse.statusCode = code;
        mockCallHandler.handle.mockReturnValue(of({ test: 'data' }));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
          expect(result.statusCode).toBe(code);
          completed++;
          if (completed === statusCodes.length) {
            done();
          }
        });
      });
    });

    it('should preserve complex nested objects', (done) => {
      const complexData = {
        user: {
          id: 1,
          name: 'John Doe',
          profile: {
            age: 30,
            email: 'john@example.com',
            address: {
              street: '123 Main St',
              city: 'New York',
              country: 'USA'
            }
          }
        },
        metadata: {
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      mockCallHandler.handle.mockReturnValue(of(complexData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result.data).toEqual(complexData);
        expect(result.statusCode).toBe(200);
        done();
      });
    });

    it('should propagate errors without transformation', (done) => {
      const testError = new Error('Test error');
      mockCallHandler.handle.mockReturnValue(throwError(() => testError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(error).toBe(testError);
          expect(error.message).toBe('Test error');
          done();
        }
      });
    });

    it('should handle multiple sequential requests', (done) => {
      const data1 = { id: 1 };
      const data2 = { id: 2 };

      mockCallHandler.handle.mockReturnValueOnce(of(data1));
      mockCallHandler.handle.mockReturnValueOnce(of(data2));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result1) => {
        expect(result1.data).toEqual(data1);

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result2) => {
          expect(result2.data).toEqual(data2);
          done();
        });
      });
    });

    it('should call handler.handle() exactly once per request', (done) => {
      mockCallHandler.handle.mockReturnValue(of('data'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('should return an Observable', () => {
      mockCallHandler.handle.mockReturnValue(of('data'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('should access response through switchToHttp', (done) => {
      const switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn(),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      });

      mockExecutionContext.switchToHttp = switchToHttp;
      mockCallHandler.handle.mockReturnValue(of('data'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(switchToHttp).toHaveBeenCalled();
        done();
      });
    });

    it('should handle data that already has a data property', (done) => {
      const dataWithDataProp = {
        data: 'nested data',
        other: 'value'
      };

      mockCallHandler.handle.mockReturnValue(of(dataWithDataProp));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: dataWithDataProp,
          statusCode: 200,
        });
        expect(result.data.data).toBe('nested data');
        done();
      });
    });

    it('should handle data that already has a statusCode property', (done) => {
      const dataWithStatusCode = {
        statusCode: 'custom',
        message: 'value'
      };

      mockCallHandler.handle.mockReturnValue(of(dataWithStatusCode));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          data: dataWithStatusCode,
          statusCode: 200,
        });
        // The outer statusCode should be from the response, not the data
        expect(result.statusCode).toBe(200);
        expect(result.data.statusCode).toBe('custom');
        done();
      });
    });

    it('should handle arrays of objects', (done) => {
      const arrayOfObjects = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];

      mockCallHandler.handle.mockReturnValue(of(arrayOfObjects));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result.data).toEqual(arrayOfObjects);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBe(3);
        done();
      });
    });

    it('should work with 404 status code', (done) => {
      mockResponse.statusCode = 404;
      mockCallHandler.handle.mockReturnValue(of({ message: 'Not found' }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result.statusCode).toBe(404);
        expect(result.data).toEqual({ message: 'Not found' });
        done();
      });
    });

    it('should work with 500 status code', (done) => {
      mockResponse.statusCode = 500;
      mockCallHandler.handle.mockReturnValue(of({ error: 'Internal server error' }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result.statusCode).toBe(500);
        expect(result.data).toEqual({ error: 'Internal server error' });
        done();
      });
    });
  });

  describe('Response interface', () => {
    it('should match the Response<T> interface structure', (done) => {
      const testData = { test: 'value' };
      mockCallHandler.handle.mockReturnValue(of(testData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('statusCode');
        expect(Object.keys(result)).toHaveLength(2);
        done();
      });
    });
  });

  describe('type safety', () => {
    it('should preserve type information for generic data', (done) => {
      interface User {
        id: number;
        name: string;
      }

      const user: User = { id: 1, name: 'John' };
      mockCallHandler.handle.mockReturnValue(of(user));

      const typedInterceptor = new TransformInterceptor<User>();

      typedInterceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result.data).toEqual(user);
        expect(typeof result.data.id).toBe('number');
        expect(typeof result.data.name).toBe('string');
        done();
      });
    });
  });
});