import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, UseGuards, InternalServerErrorException, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
    async test(
        @KMSClientId() clientId: p3Values.Guid,
        @KMSKeyName() keyName: string,
    ) {
        return { clientId: clientId.toString(), keyName };
    }
}

describe('KMSModule 사용 사례 E2E', () => {
    let app: INestApplication;
    let verifier: KMSVerifier;
    const mockClientId = p3Values.Guid.create('client');
    const mockKeyName = 'test-key';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [KMSModule.forRoot({ agentURL: 'http://fake-url' })],
            controllers: [TestController],
        })
            .overrideProvider(KMSVerifier)
            .useValue({ verify: jest.fn() })
            .compile();

        verifier = module.get<KMSVerifier>(KMSVerifier);
        app = module.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('/test (GET) - 가드 통과하고 kms 데이터를 반환해야 함', () => {
        (verifier.verify as jest.Mock).mockResolvedValue([
            mockClientId,
            mockKeyName,
        ]);

        return request(app.getHttpServer())
            .get('/test')
            .set('Authorization', 'Bearer any-token')
            .expect(200)
            .expect((res: any) => {
                expect(res.body.clientId).toEqual(mockClientId.toString());
                expect(res.body.keyName).toEqual(mockKeyName);
            });
    });

    it('/test (GET) - 검증 실패 시 500 에러를 반환해야 함', () => {
        (verifier.verify as jest.Mock).mockRejectedValue(
            new InternalServerErrorException('Verification failed'),
        );

        return request(app.getHttpServer())
            .get('/test')
            .set('Authorization', 'Bearer any-token')
            .expect(500);
    });

    it('/test (GET) - Authorization 헤더 없으면 400 에러를 반환', () => {
        return request(app.getHttpServer())
            .get('/test')
            .expect(400);
    });

    it('/test (GET) - Authorization 헤더 형식이 Bearer가 아니면 400 에러를 반환', () => {
        return request(app.getHttpServer())
            .get('/test')
            .set('Authorization', 'Basic any-token')
            .expect(400);
    });

    it('/test (GET) - 검증 실패(401) 시 401 에러를 반환', () => {
        (verifier.verify as jest.Mock).mockRejectedValue(
            new UnauthorizedException('Invalid token'),
        );

        return request(app.getHttpServer())
            .get('/test')
            .set('Authorization', 'Bearer any-token')
            .expect(401);
    });

    it('/test (GET) - 검증 실패(400) 시 400 에러를 반환', () => {
        (verifier.verify as jest.Mock).mockRejectedValue(
            new BadRequestException('Bad token'),
        );

        return request(app.getHttpServer())
            .get('/test')
            .set('Authorization', 'Bearer any-token')
            .expect(400);
    });
});
