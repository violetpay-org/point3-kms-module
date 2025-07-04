import { KMSGuard } from "./guard";
import { DynamicModule } from "@nestjs/common";
import { KMSVerifier } from "./service";

export interface KMSModuleOption {
    agentURL?: string;
}

export class KMSModule {
    static forRoot(option?: KMSModuleOption): DynamicModule {
        return {
            module: KMSModule,
            providers: [
                {
                    provide: KMSVerifier,
                    useValue: new KMSVerifier(option?.agentURL)
                },
                KMSGuard,
            ],
            exports: [KMSGuard, KMSVerifier]
        }
    }
}