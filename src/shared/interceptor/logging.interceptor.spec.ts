import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    };

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should log "Before..." when request starts', (done) => {
      mockCallHandler.handle.mockReturnValue(of('test data'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith('Before...');
        done();
      });
    });

    it('should log execution time after request completes', (done) => {
      mockCallHandler.handle.mockReturnValue(of('test data'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 'Before...');
        expect(consoleLogSpy).toHaveBeenNthCalledWith(2, expect.stringMatching(/^After\.\.\. \d+ms$/));
        done();
      });
    });

    it('should measure and log execution time accurately', (done) => {
      const delay = 100;
      mockCallHandler.handle.mockReturnValue(
        of('test data').pipe()
      );

      const startTime = Date.now();
      
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const calls = consoleLogSpy.mock.calls;
        const afterLog = calls[1][0];
        const timeMatch = afterLog.match(/After\.\.\. (\d+)ms/);
        
        expect(timeMatch).not.toBeNull();
        const loggedTime = parseInt(timeMatch[1], 10);
        expect(loggedTime).toBeGreaterThanOrEqual(0);
        expect(loggedTime).toBeLessThan(1000);
        done();
      });
    });

    it('should pass through the response data unchanged', (done) => {
      const testData = { id: 1, name: 'Test' };
      mockCallHandler.handle.mockReturnValue(of(testData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual(testData);
        done();
      });
    });

    it('should handle string responses', (done) => {
      const testString = 'Hello World';
      mockCallHandler.handle.mockReturnValue(of(testString));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toBe(testString);
        expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('should handle number responses', (done) => {
      const testNumber = 42;
      mockCallHandler.handle.mockReturnValue(of(testNumber));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toBe(testNumber);
        done();
      });
    });

    it('should handle array responses', (done) => {
      const testArray = [1, 2, 3, 4, 5];
      mockCallHandler.handle.mockReturnValue(of(testArray));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual(testArray);
        done();
      });
    });

    it('should handle null responses', (done) => {
      mockCallHandler.handle.mockReturnValue(of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toBeNull();
        expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('should handle undefined responses', (done) => {
      mockCallHandler.handle.mockReturnValue(of(undefined));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should handle empty object responses', (done) => {
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({});
        done();
      });
    });

    it('should log even when errors occur', (done) => {
      const error = new Error('Test error');
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(consoleLogSpy).toHaveBeenCalledWith('Before...');
          done();
        }
      });
    });

    it('should propagate errors without modification', (done) => {
      const testError = new Error('Test error message');
      mockCallHandler.handle.mockReturnValue(throwError(() => testError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(error).toBe(testError);
          expect(error.message).toBe('Test error message');
          done();
        }
      });
    });

    it('should handle multiple sequential requests', (done) => {
      mockCallHandler.handle.mockReturnValue(of('data'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const firstCallCount = consoleLogSpy.mock.calls.length;
        expect(firstCallCount).toBe(2);

        consoleLogSpy.mockClear();
        mockCallHandler.handle.mockReturnValue(of('more data'));

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(consoleLogSpy).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });

    it('should measure time independently for concurrent requests', (done) => {
      const handler1 = { handle: jest.fn().mockReturnValue(of('data1')) };
      const handler2 = { handle: jest.fn().mockReturnValue(of('data2')) };

      let completed = 0;
      const checkDone = () => {
        completed++;
        if (completed === 2) {
          expect(consoleLogSpy).toHaveBeenCalledTimes(4);
          done();
        }
      };

      interceptor.intercept(mockExecutionContext, handler1).subscribe(() => checkDone());
      interceptor.intercept(mockExecutionContext, handler2).subscribe(() => checkDone());
    });

    it('should format time as milliseconds with "ms" suffix', (done) => {
      mockCallHandler.handle.mockReturnValue(of('data'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const afterLog = consoleLogSpy.mock.calls[1][0];
        expect(afterLog).toMatch(/After\.\.\. \d+ms$/);
        expect(afterLog).toContain('ms');
        done();
      });
    });

    it('should handle very fast responses (0ms)', (done) => {
      mockCallHandler.handle.mockReturnValue(of('instant'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const afterLog = consoleLogSpy.mock.calls[1][0];
        const timeMatch = afterLog.match(/(\d+)ms/);
        const time = parseInt(timeMatch[1], 10);
        expect(time).toBeGreaterThanOrEqual(0);
        done();
      });
    });

    it('should work with complex nested objects', (done) => {
      const complexData = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            age: 30,
            address: {
              city: 'New York',
              country: 'USA'
            }
          }
        },
        posts: [
          { id: 1, title: 'Post 1' },
          { id: 2, title: 'Post 2' }
        ]
      };

      mockCallHandler.handle.mockReturnValue(of(complexData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual(complexData);
        expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('should call handler.handle() exactly once', (done) => {
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
  });

  describe('timing precision', () => {
    it('should show reasonable time for immediate responses', (done) => {
      mockCallHandler.handle.mockReturnValue(of('data'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const afterLog = consoleLogSpy.mock.calls[1][0];
        const timeMatch = afterLog.match(/(\d+)ms/);
        const time = parseInt(timeMatch[1], 10);
        
        // Should be very quick for synchronous operations
        expect(time).toBeLessThan(100);
        done();
      });
    });
  });
});