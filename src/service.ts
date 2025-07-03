import axios, { AxiosError } from "axios";
import { p3Values } from "point3-common-tool";
import { InternalServerErrorException, UnauthorizedException } from "@nestjs/common";

export class KMSVerifier {
    constructor(
        private readonly agentURL: string = "http://kms:3342",
    ){}

    async verify(token: string, ip: string): Promise<[clientId: p3Values.Guid, keyName: string]> {
        try {
            const res = await axios.post(`${this.agentURL}/verify`, {
                token,
                ip
            });

            if (res.data && res.data.clientId && res.data.keyName) {
                return [
                    p3Values.Guid.parse(res.data.clientId),
                    res.data.keyName,
                ];
            } else {
                throw new InternalServerErrorException('Invalid response from KMS agent');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                if (axiosError.response) {
                    const { status, data } = axiosError.response;
                    const message = (data as any)?.message || 'Verification failed';
                    
                    if (status >= 400 && status < 500) {
                        throw new UnauthorizedException(`[KMS] ${message}`);
                    }
                    throw new InternalServerErrorException(`[KMS] Agent error with status ${status}`);
                } else if (axiosError.request) {
                    throw new InternalServerErrorException('[KMS] No response from agent');
                }
            }
            throw new InternalServerErrorException(`[KMS] Unexpected error: ${(error as Error).message}`);
        }
    }
}