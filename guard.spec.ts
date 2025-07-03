import { KMSGuard } from './guard';
import { KMSVerifier } from './service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as requestIp from '@supercharge/request-ip';

jest.mock('./service');
jest.mock('@supercharge/request-ip');

describe('KMSGuard', () => {
    let guard: KMSGuard;
    let verifier: KMSVerifier;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [KMSGuard, KMSVerifier],
        }).compile();

        guard = moduleRef.get<KMSGuard>(KMSGuard);
        verifier = moduleRef.get<KMSVerifier>(KMSVerifier);
    });

    describe('canActivate', () => {
        let mockContext: ExecutionContext;
        let mockRequest: any;

        beforeEach(() => {
            mockRequest = {
                headers: {
                    authorization: 'test-token',
                },
            };
            mockContext = {
                switchToHttp: () => ({
                    getRequest: () => mockRequest,
                }),
            } as ExecutionContext;
        });

        it('검증 성공 시 true를 반환, Request에 KMS 데이터 추가', async () => {
            const mockClientIdString = 'a4f7b3b1-4c2f-4d3a-8e1b-2c3d4e5f6a7b';
            const mockGuid = {toString: () => mockClientIdString};
            const keyName = 'test-key';

            (requestIp.getClientIp as jest.Mock).mockReturnValue('127.0.0.1');
            (verifier.verify as jest.Mock).mockResolvedValue([mockGuid, keyName]);

            const result = await guard.canActivate(mockContext);

            expect(result).toBe(true);
            expect(mockRequest.KMSClientId).toBe(mockGuid);
            expect(mockRequest.KMSkeyName).toBe(keyName);
        });

        it('실패 - IP 주소 없으면 ForbiddenException', async () => {
            (requestIp.getClientIp as jest.Mock).mockReturnValue(null);

            await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        });

        it('실패 - KMS 오류 시 동일 에러 throw', async () => {
            const errorMessage = 'Verification failed';
            (requestIp.getClientIp as jest.Mock).mockReturnValue('127.0.0.1');
            (verifier.verify as jest.Mock).mockRejectedValue(new Error(errorMessage));

            await expect(guard.canActivate(mockContext)).rejects.toThrow(errorMessage);
        });
    });
});
