# NestJS용 Point3 KMS 모듈

고객사 KMS 토큰 검증을 위한 NestJS 모듈

## 설치

```bash
npm install @point3/kms
```

## 사용 방법

### 1. 모듈 가져오기

`KMSModule`을 루트 `AppModule`이나 다른 기능 모듈에서 가져옵니다. `forRoot()` 정적 메소드를 사용하여 설정을 전달합니다.
Docker compose로 에이전트를 같이 올려 사용한다면 해당 에이전트 컨테이너의 `hostname`을 `kms`로 지정하면,  별도의 `agentURL` 설정을 하지 않아도 `http://kms:3342`로 설정되기 때문에 잘 작동합니다.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { KMSModule } from '@point3/kms';

@Module({
  imports: [
    KMSModule.forRoot({
      agentURL: 'http://your-kms-agent-url:port', // 실제 KMS 에이전트 URL로 교체하세요
    }),
    // ... 다른 모듈들
  ],
})
export class AppModule {}
```

만약 `agentURL`을 제공하지 않으면, 기본값인 `http://kms:3342`로 설정됩니다.

### 2. 라우트 보호하기

KMS 토큰 검증이 필요한 모든 컨트롤러나 특정 라우트에 `KMSGuard`를 사용하세요.

```typescript
// your.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { KMSGuard } from '@point3/kms';

@Controller('protected-resource')
@UseGuards(KMSGuard)
export class YourController {
  @Get()
  getProtectedData() {
    return '이 데이터는 KMS에 의해 보호됩니다!';
  }
}
```

### 3. 컨트롤러에서 KMS 데이터 접근하기

`KMSGuard`로 라우트가 보호되면, `@KMSClientId()`와 `@KMSKeyName()` 데코레이터를 사용하여 검증된 데이터에 직접 접근할 수 있습니다.

-   `@KMSClientId()`: 검증된 클라이언트 ID(`p3Values.Guid` 타입)를 주입합니다.
-   `@KMSKeyName()`: 검증된 키 이름(`string` 타입)을 주입합니다.

```typescript
// your.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { KMSGuard, KMSClientId, KMSKeyName } from '@point3/kms';
import { p3Values } from 'point3-common-tool';

@Controller('user-data')
@UseGuards(KMSGuard)
export class YourController {
  @Get()
  getUserData(
    @KMSClientId() clientId: p3Values.Guid,
    @KMSKeyName() keyName: string,
  ) {
    console.log(`요청 클라이언트: ${clientId.toString()}`);
    console.log(`사용된 키: ${keyName}`);

    // 여기에 로직을 작성하세요...
    return {
      message: '사용자 데이터에 성공적으로 접근했습니다.',
      clientId: clientId.toString(),
      keyName: keyName,
    };
  }
}
```

## API

### `KMSModule.forRoot(option)`

모듈을 설정합니다.

-   `option.agentURL` (string, optional): KMS 검증 에이전트의 URL입니다.

### `KMSGuard`

토큰 검증 로직을 처리하는 NestJS 가드입니다. `Authorization` 헤더와 클라이언트 IP 주소를 읽어 KMS 에이전트로 전송하고, 성공 시 요청 객체에 결과를 첨부합니다.

### 오류 처리(Error Handling)

`KMSGuard`는 검증 과정에서 다양한 오류가 발생할 경우, 다음과 같은 NestJS 표준 예외를 던집니다.

-   **`ForbiddenException` (403)**
    -   요청에서 클라이언트의 IP 주소를 확인할 수 없을 때 발생합니다.
-   **`BadRequestException` (400)**
    -   `Authorization` 헤더가 요청에 포함되지 않았을 때 발생합니다.
    -   `Authorization` 헤더의 형식이 `Bearer <token>`이 아닐 때 발생합니다.
-   **`UnauthorizedException` (401)**
    -   KMS 에이전트가 토큰이 유효하지 않다고 응답할 때 (HTTP 401) 발생합니다.
-   **`InternalServerErrorException` (500)**
    -   KMS 에이전트 자체에 오류가 발생했거나 (HTTP 500), 에이전트의 응답을 파싱할 수 없을 때 발생합니다.

이 외에도 KMS 에이전트와의 통신 중 발생하는 다른 HTTP 오류나 네트워크 오류는 해당 상태 코드에 맞는 예외로 변환되거나 원본 오류 그대로 전달될 수 있습니다.

### `@KMSClientId()`

요청 객체에서 `clientId`(`p3Values.Guid` 객체)를 추출하는 파라미터 데코레이터입니다. `KMSGuard`로 보호되는 경로에서 사용해야 합니다.

### `@KMSKeyName()`

요청 객체에서 `keyName`(`string`)을 추출하는 파라미터 데코레이터입니다. `KMSGuard`로 보호되는 경로에서 사용해야 합니다.

## 개발

```bash
npm test
```