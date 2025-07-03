import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, UseGuards } from '@nestjs/common';
import request from 'supertest';
import { KMSModule } from './module';
import { KMSGuard } from './guard';
import { KMSVerifier } from './service';
import { KMSClientId, KMSKeyName } from './decorator';
import { p3Values } from 'point3-common-tool';

@Controller()
class TestController {
    @UseGuards(KMSGuard)
    @Get('test')
    async getKmsData(
        @KMSClientId() clientId: p3Values.Guid,
        @KMSKeyName() keyName: string,
    ) {
        return { clientId: clientId.toString(), keyName };
    }
}

describe('KMSModule 사용 테스트 (E2E 테스트)', () => {
    let app: INestApplication;
    let mockKmsVerifier: Partial<KMSVerifier>;

    const mockClientId = 'client-c4f7b3b1-4c2f-4d3a-8e2b-2c3d4e5f6a7b';
    const mockKeyName = 'e2e-key-name';
    const mockGuid = { toString: () => mockClientId };

    beforeEach(async () => {
        mockKmsVerifier = {
            verify: jest.fn().mockResolvedValue([mockGuid, mockKeyName]),
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [KMSModule.forRoot({ agentURL: 'http://fake-url.com' })],
            controllers: [TestController],
        })
            .overrideProvider(KMSVerifier)
            .useValue(mockKmsVerifier)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('/test (GET) - Guard 통과, KMS 데이터 반환', () => {
        // 4. HTTP 요청 시뮬레이션 및 5. 결과 검증
        return request(app.getHttpServer())
            .get('/test')
            .set('Authorization', 'any-token')
            .expect(200)
            .expect((res: any) => {
                expect(res.body.clientId).toEqual(mockClientId);
                expect(res.body.keyName).toEqual(mockKeyName);
            });
    });

    it('/test (GET) - 검증 실패 시 500 서버 에러를 반환해야 합니다', async () => {
        (mockKmsVerifier.verify as jest.Mock).mockRejectedValue(
            new Error('Verification failed'),
        );

        return request(app.getHttpServer())
            .get('/test')
            .set('Authorization', 'any-token')
            .expect(500); // It will be 500 because the guard will throw an unhandled error
    });
});
