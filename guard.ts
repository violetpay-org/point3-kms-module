import {CanActivate, ExecutionContext, Injectable, Inject, ForbiddenException} from "@nestjs/common";
import * as requestIp from '@supercharge/request-ip';
import {KMSVerifier} from "./service";

@Injectable()
export class KMSGuard implements CanActivate {
    constructor(
        @Inject(KMSVerifier) private readonly verifier: KMSVerifier
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const ip = requestIp.getClientIp(request);
        if (!ip) throw new ForbiddenException(); // 아이피 없는 경우

        const [clientId, keyName] = await this.verifier.verify(request.headers.authorization, ip)
        request.KMSClientId = clientId;
        request.KMSkeyName = keyName;

        return true;
    }
}