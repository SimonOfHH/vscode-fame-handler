import { AccountInfo, AuthenticationResult, InteractionRequiredAuthError, LogLevel, PublicClientApplication } from "@azure/msal-node";
import axios from "axios";
import * as vscode from 'vscode';
import { AUTHORITY_BASE, CACHE_TOKEND365, CACHE_TOKENGRAPH, D365_APPS_API, GRAPH_API_BASE, SCOPE_D365_APP, SCOPE_GRAPH_USERREADALL, SETTINGS } from '../constants/index';
import { CacheProvider, ValueProvider } from "../providers/index";
import { IPrincipal } from "../types/index";
import { Utilities } from "./Utilities";

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
        vscode.env.openExternal(vscode.Uri.parse(url));
    }
    public static getAuthConfig() {
        if (!Utilities.configurationExists()) {
            throw Error(`Setup incomplete (validate values for ${SETTINGS.d365ApiClientId} and ${SETTINGS.d365ApiTenantId})`);
        }
        const authConfig = {
            auth: {
                clientId: Utilities.getConfigurationValue(SETTINGS.d365ApiClientId) as string,
                authority: `${AUTHORITY_BASE}/${Utilities.getConfigurationValue(SETTINGS.d365ApiTenantId) as string}`
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
    //#region Token-helper
    public static async getAuthResult(pca: PublicClientApplication, cache: CacheProvider, fromSignIn: boolean, type: ApiType): Promise<AuthenticationResult | null | undefined> {
        const authResult = await ApiProviderHelper.getTokenFromCache(cache, false, type);
        if (authResult && fromSignIn === false) { return authResult; }
        return await ApiProviderHelper.acquireToken(type, pca);
    }
    // from msal-node sample (modified)
    public static async acquireToken(type: ApiType, pca: PublicClientApplication) {
        const accounts = await pca.getTokenCache().getAllAccounts();
        if (accounts.length === 1) {
            return pca.acquireTokenSilent(ApiProviderHelper.getSilentRequest(accounts, type)).catch((e) => {
                if (e instanceof InteractionRequiredAuthError) {
                    return pca.acquireTokenInteractive(ApiProviderHelper.getLoginRequest(type));
                }
            });
        } else if (accounts.length > 1) {
            accounts.forEach((account: { username: any; }) => {
                console.log(account.username);
            });
            return Promise.reject("Multiple accounts found. Please select an account to use.");
        } else {
            return pca.acquireTokenInteractive(ApiProviderHelper.getLoginRequest(type));
        }
    }
    public static async getTokenFromCache(cache: CacheProvider, throwError: boolean, type: ApiType): Promise<AuthenticationResult | null> {
        let token = await cache.get("v1", ApiProviderHelper.getTokenIdentifier(type)) as AuthenticationResult;
        if (!token && throwError) {
            //throw new Error("You need to sign in first.");
            return null;
        }
        if (!ApiProviderHelper.authenticationResultIsValid(token)) {
            ApiProviderHelper.updateAuthenticationResultInCache(cache, null, type);
            if (throwError) {
                throw new Error("Session expired. You need to sign in.");
            }
            return null;
        }
        return token;
    }
    public static updateAuthenticationResultInCache(cache: CacheProvider, authResult: AuthenticationResult | null | undefined, type: ApiType) {
        cache.put("v1", ApiProviderHelper.getTokenIdentifier(type), authResult, authResult?.expiresOn as Date);
    }

    public static async configureAxiosInstance(cache: CacheProvider, type: ApiType) {
        let accessToken = await (await ApiProviderHelper.getTokenFromCache(cache, true, type))?.accessToken;
        let baseURL = D365_APPS_API;
        if (type === ApiType.Graph) {
            baseURL = GRAPH_API_BASE;
        }
        this.prepareAxiosValues(accessToken, baseURL);
    }
    private static prepareAxiosValues(accessToken: string | undefined, baseUrl: string) {
        axios.defaults.baseURL = baseUrl;
        axios.interceptors.request.clear(); // clear, because we use 2 different endpoints and I can't figure out why the second is throwing errors
        axios.interceptors.request.use((config) => {
            if (accessToken) {
                config.headers.Authorization = `Bearer ${accessToken}`;
            }
            return config;
        });
    }
    //#endregion
    public static getPrincipalBody = (principal: IPrincipal, roles: string[]) => {
        if (principal.principalType.toLowerCase() === "user") {
            return {
                "aadTenantId": Utilities.getConfigurationValue(SETTINGS.d365ApiTenantId) as string,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "Type": "User",
                "roles": roles
            };
        } else if (principal.principalType.toLowerCase() === "application") {
            return {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "Type": "Application",
                "roles": roles
            };
        } else {
            throw Error("Invalid principal type");
        }
    };
}
export enum ApiType {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    D365,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Graph
}