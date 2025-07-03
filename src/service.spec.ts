import axios, { AxiosError } from 'axios';
import { KMSVerifier } from './service';
import {
    BadRequestException,
    HttpStatus,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { p3Values } from 'point3-common-tool';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KMSVerifier', () => {
    let verifier: KMSVerifier;
    const agentURL = 'http://fake-kms-agent.com';
    const token = 'test-token';
    const ipAddress = '127.0.0.1';

    const createAxiosError = (status: HttpStatus, data: any): AxiosError => {
        return {
            isAxiosError: true,
            response: { status, data, statusText: 'err', headers: {}, config: {} as any },
            name: 'AxiosError',
            message: 'err'
        } as AxiosError;
    };

    beforeEach(() => {
        mockedAxios.post.mockClear();
        mockedAxios.isAxiosError.mockImplementation((payload: any): payload is AxiosError => {
            return payload && payload.isAxiosError === true;
        });
        verifier = new KMSVerifier(agentURL);
    });

    describe('verify', () => {
        it('검증 성공 시 Guid와 keyName 반환', async () => {
            const mockClientId = p3Values.Guid.create('client');
            const mockKeyName = 'test-key';

            mockedAxios.post.mockResolvedValue({
                data: { result: { clientId: mockClientId.toString(), keyName: mockKeyName } },
            });

            const [clientId, keyName] = await verifier.verify(token, ipAddress);

            expect(mockedAxios.post).toHaveBeenCalledWith(`${agentURL}/m2m/verify`, { token, ipAddress });
            expect(clientId).toEqual(mockClientId);
            expect(keyName).toEqual(mockKeyName);
        });

        it('실패 - 에이전트 400 응답하면 BadRequestException', async () => {
            const error = createAxiosError(HttpStatus.BAD_REQUEST, { message: 'Bad Request' });
            mockedAxios.post.mockRejectedValue(error);
            await expect(verifier.verify(token, ipAddress)).rejects.toThrow(BadRequestException);
        });

        it('실패 - 에이전트 401 응답하면 UnauthorizedException', async () => {
            const error = createAxiosError(HttpStatus.UNAUTHORIZED, { message: 'Unauthorized' });
            mockedAxios.post.mockRejectedValue(error);
            await expect(verifier.verify(token, ipAddress)).rejects.toThrow(UnauthorizedException);
        });

        it('실패 - 에이전트 500 응답하면 InternalServerErrorException', async () => {
            const error = createAxiosError(HttpStatus.INTERNAL_SERVER_ERROR, { message: 'Internal Error' });
            mockedAxios.post.mockRejectedValue(error);
            await expect(verifier.verify(token, ipAddress)).rejects.toThrow(InternalServerErrorException);
        });

        it('실패 - 네트워크 오류면 원본 에러', async () => {
            const networkError = new Error('Network Error');
            mockedAxios.isAxiosError.mockReturnValue(false);
            mockedAxios.post.mockRejectedValue(networkError);
            await expect(verifier.verify(token, ipAddress)).rejects.toThrow('Network Error');
        });

        it('실패 - KMS 에이전트 응답 파싱 오류 - InternalServerErrorException', async () => {
            mockedAxios.post.mockResolvedValue({ data: { result: {} } }); // clientId 또는 keyName 누락
            await expect(verifier.verify(token, ipAddress)).rejects.toThrow(InternalServerErrorException);
        });
    });
});
