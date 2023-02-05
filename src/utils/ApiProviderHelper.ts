import { AccountInfo, AuthenticationResult, LogLevel } from "@azure/msal-node";
import * as vscode from 'vscode';
import { AUTHORITY_BASE, CACHE_TOKEND365, CACHE_TOKENGRAPH, SCOPE_D365_APP, SCOPE_GRAPH_USERREADALL, SETTINGS } from '../constants';
import { ValueProvider } from "../providers";

export class ApiProviderHelper {
    public static getTokenIdentifier(type: ApiType) {
        switch (type) {
            case ApiType.D365: return CACHE_TOKEND365;
            case ApiType.Graph: return CACHE_TOKENGRAPH;
        };
    }
    public static getSilentRequest(accounts: Array<AccountInfo>, type: ApiType) {
        const silentRequest = {
            account: accounts[0],
            scopes: ApiProviderHelper.getScopes(type)
        };
        return silentRequest;
    }
    public static getLoginRequest(type: ApiType) {
        const loginRequest = {
            scopes: ApiProviderHelper.getScopes(type),
            openBrowser: ApiProviderHelper.openBrowser,
            successTemplate: "Successfully signed in! You can close this window now."
        };
        return loginRequest;
    }
    public static authenticationResultIsValid(authResult: AuthenticationResult | undefined) {
        if (authResult) {
            if (ValueProvider.tokenIsExpired(authResult) === false) {
                return true;
            }
        }
        return false;
    }
    public static getAxiosOptions(accessToken: string) {
        const options = {
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Authorization: `Bearer ${accessToken}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "Content-Type": "application/json"
            }
        };
        return options;
    }
    public static async openBrowser(url: string) {
        let open = require("open");
        open(url);
    }
    public static getAuthConfig() {
        if (!vscode.workspace.getConfiguration(SETTINGS.key).get(SETTINGS.d365ApiClientId)) {
            vscode.window.showInformationMessage(`You need to setup configuration for ${SETTINGS.d365ApiClientId}`);
            throw Error(`You need to setup configuration for ${SETTINGS.d365ApiClientId}`);
        }
        if (!vscode.workspace.getConfiguration(SETTINGS.key).get(SETTINGS.d365ApiTenantId)) {
            vscode.window.showInformationMessage(`You need to setup configuration for ${SETTINGS.d365ApiTenantId}`);
            throw Error(`You need to setup configuration for ${SETTINGS.d365ApiTenantId}`);
        }
        const authConfig = {
            auth: {
                clientId: vscode.workspace.getConfiguration(SETTINGS.key).get(SETTINGS.d365ApiClientId) as string,
                authority: `${AUTHORITY_BASE}/${vscode.workspace.getConfiguration(SETTINGS.key).get(SETTINGS.d365ApiTenantId) as string}`
            },
            //cache: {
            //    cachePlugin: CachePlugin
            //},
            system: {
                loggerOptions: {
                    loggerCallback(loglevel: any, message: any, containsPii: any) {
                        console.log(message);
                    },
                    piiLoggingEnabled: false,
                    logLevel: LogLevel.Trace,
                }
            }
        };
        return authConfig;
    }
    public static getScopes(type: ApiType) {
        switch (type) {
            case ApiType.D365: return [SCOPE_D365_APP];
            case ApiType.Graph: return [SCOPE_GRAPH_USERREADALL];
        };
    }
}
export enum ApiType {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    D365,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Graph
}