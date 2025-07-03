import { KMSGuard } from './guard';
import { KMSVerifier } from './service';
import { ExecutionContext, BadRequestException, ForbiddenException } from '@nestjs/common';
import { p3Values } from 'point3-common-tool';
import * as requestIp from '@supercharge/request-ip';

jest.mock('./service');
jest.mock('@supercharge/request-ip');

describe('KMSGuard', () => {
    let guard: KMSGuard;
    let verifier: KMSVerifier;

    beforeEach(() => {
        jest.clearAllMocks();
        verifier = new KMSVerifier();
        guard = new KMSGuard(verifier);
    });

    const createMockContext = (request: any): ExecutionContext => {
        return {
            switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext;
    };

    describe('canActivate', () => {
        it('검증 성공 시 true 반환, request 객체에 데이터 추가', async () => {
            const mockRequest = { headers: { authorization: 'Bearer test-token' } };
            const mockContext = createMockContext(mockRequest);
            const mockClientId = p3Values.Guid.create('client');
            const mockKeyName = 'test-key';

            (requestIp.getClientIp as jest.Mock).mockReturnValue('127.0.0.1');
            (verifier.verify as jest.Mock).mockResolvedValue([mockClientId, mockKeyName]);

            const result = await guard.canActivate(mockContext);

            expect(result).toBe(true);
            expect(verifier.verify).toHaveBeenCalledWith('test-token', '127.0.0.1');
            expect((mockRequest as any).KMSClientId).toBe(mockClientId);
            expect((mockRequest as any).KMSkeyName).toBe(mockKeyName);
        });

        it('실패 - KMS 오류 시 해당 에러를 그대로 throw', async () => {
            const mockRequest = { headers: { authorization: 'Bearer test-token' } };
            const mockContext = createMockContext(mockRequest);
            const errorMessage = 'Verification failed';

            (requestIp.getClientIp as jest.Mock).mockReturnValue('127.0.0.1');
            (verifier.verify as jest.Mock).mockRejectedValue(new Error(errorMessage));

            await expect(guard.canActivate(mockContext)).rejects.toThrow(errorMessage);
            expect(verifier.verify).toHaveBeenCalledWith('test-token', '127.0.0.1');
        });

        it('실패 - IP 주소 없으면 ForbiddenException', async () => {
            const mockRequest = { headers: { authorization: 'Bearer test-token' } };
            const mockContext = createMockContext(mockRequest);

            (requestIp.getClientIp as jest.Mock).mockReturnValue(null);

            await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        });

        it('실패 - Authorization 헤더 없으면 BadRequestException', async () => {
            const mockRequest = { headers: {} };
            const mockContext = createMockContext(mockRequest);

            (requestIp.getClientIp as jest.Mock).mockReturnValue('127.0.0.1');

            await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
        });

        it('실패 - Authorization 헤더 형식이 틀리면 BadRequestException', async () => {
            const mockRequest = { headers: { authorization: 'NotBearer test-token' } };
            const mockContext = createMockContext(mockRequest);

            (requestIp.getClientIp as jest.Mock).mockReturnValue('127.0.0.1');

            await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
        });
    });
});
