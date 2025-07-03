import axios, { AxiosError } from 'axios';
import { p3Values } from 'point3-common-tool';
import {
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

export class KMSVerifier {
  constructor(private readonly agentURL: string = 'http://kms:3342') {}

  async verify(
    token: string,
    ipAddress: string,
  ): Promise<[clientId: p3Values.Guid, keyName: string]> {
    try {
      const res = await axios.post(`${this.agentURL}/m2m/verify`, {
        token,
        ipAddress,
      });

      if (!res.data || !res.data.result || !res.data.result.clientId || !res.data.result.keyName) {
        throw new InternalServerErrorException('Invalid response from KMS agent');
      }

      return [
        p3Values.Guid.parse(res.data.result.clientId),
        res.data.result.keyName,
      ];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        switch (error.response.status) {
          case HttpStatus.BAD_REQUEST:
            throw new BadRequestException('잘못된 토큰 형식 또는 필수 필드 누락');
          case HttpStatus.UNAUTHORIZED:
            throw new UnauthorizedException('허용되지 않은 IP 또는 토큰 서명 검증 실패');
          case HttpStatus.INTERNAL_SERVER_ERROR:
            throw new InternalServerErrorException('KMS Agent internal server error');
        }
      }

      throw error;
    }
  }
}