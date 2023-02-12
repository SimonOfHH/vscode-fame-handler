import { PublicClientApplication } from "@azure/msal-node";
import { AxiosError } from "axios";
import { ExtensionContext } from 'vscode';
import { CACHE_FAMEAPPS, CACHE_IDNAMEMAP, CACHE_NAME } from '../constants';
import { AppCountryRequestProvider, AppEnvironmentHotfixRequestProvider, AppEnvironmentRequestProvider, AppPrincipalRequestProvider, AppRequestProvider, AppVersionRequestProvider, CacheProvider, CommandProvider, UserRequestProvider, ValueProvider } from '../providers';
import { IFameApp, IFameAppCountry, IFameAppEnvironment, IFameAppEnvironmentHotifx, IFameAppPrincipal, IFameAppVersion, IGraphUser, IPrincipal } from '../types';
import { ApiProviderHelper, ApiType, Utilities } from "../utils";

export class ApiProvider {
    private cache: CacheProvider;
    private pca = new PublicClientApplication(ApiProviderHelper.getAuthConfig());
    private cachedPrincipalInformation: Map<string, IGraphUser> = new Map();
    private cmdProvider: CommandProvider;

    private appRequestProvider: AppRequestProvider;
    private appCountryRequestProvider: AppCountryRequestProvider;
    private appPrincipalRequestProvider: AppPrincipalRequestProvider;
    private appVersionRequestProvider: AppVersionRequestProvider;
    private appEnvironmentRequestProvider: AppEnvironmentRequestProvider;
    private appEnvironmentHotifxRequestProvider: AppEnvironmentHotfixRequestProvider;
    private userRequestProvider: UserRequestProvider;

    constructor(context: ExtensionContext, cmdProvider: CommandProvider) {
        this.cache = CacheProvider.getInstance(context, CACHE_NAME, { v1: {}, beta: {} });
        this.cmdProvider = cmdProvider;
        this.appRequestProvider = new AppRequestProvider(this.cache);
        this.appCountryRequestProvider = new AppCountryRequestProvider(this.cache);
        this.appPrincipalRequestProvider = new AppPrincipalRequestProvider(this.cache);
        this.appVersionRequestProvider = new AppVersionRequestProvider(this.cache);
        this.appEnvironmentRequestProvider = new AppEnvironmentRequestProvider(this.cache);
        this.appEnvironmentHotifxRequestProvider = new AppEnvironmentHotfixRequestProvider(this.cache);
        this.userRequestProvider = new UserRequestProvider(this.cache);
    }
    public async signIn(type: ApiType) {
        const authResult = await ApiProviderHelper.getAuthResult(this.pca, this.cache, true, type);
        ApiProviderHelper.updateAuthenticationResultInCache(this.cache, authResult, type);
        this.cmdProvider.currTreeProvider.refresh();
    }
    public async isSignedIn(type: ApiType): Promise<boolean> {
        const authResult = await ApiProviderHelper.getTokenFromCache(this.cache, false, type);
        return authResult !== null;
    }
    private async getCachedValues<T>(value: T): Promise<T> {
        let identifier = "";
        switch (typeof value) {
            case typeof <IFameApp[]>{}:
                identifier = CACHE_FAMEAPPS;
                break;
        }
        let cachedValues = await this.cache.get("v1", identifier) as T;
        return cachedValues;
    }
    //#region (Graph) User requests
    private async getUsernameForId(userId: string) {
        console.log("Looking up username");
        if (this.cachedPrincipalInformation.has(userId) === true) {
            console.log(`Returning value for ${userId} from cache.`);
            return this.cachedPrincipalInformation.get(userId)?.displayName;
        } else {
            console.log(`Getting value for ${userId} from Graph API.`);
            return (await this.getUserDetails(userId))?.displayName;
        }
    }
    public async getUsers(userNameFilter?: string): Promise<IGraphUser[]> {
        let filter = "";
        if (userNameFilter) {
            filter = `$filter=startswith(displayName, '${userNameFilter}')`;
        }
        let resultArray: IGraphUser[] = [];
        if (userNameFilter) {
            resultArray = (await this.userRequestProvider.listFiltered(filter)).value;
        }
        else {
            resultArray = (await this.userRequestProvider.list()).value;
        }
        return resultArray;
    }
    public async getUserDetails(userId: string): Promise<IGraphUser | undefined> {
        try {
            let result = await this.userRequestProvider.details(userId);
            this.cachedPrincipalInformation.set(userId, result);
            return result;
        }
        catch (e) {
            const ae = e as AxiosError;
            console.log(`Error for: ${ae.config?.baseURL}${ae.config?.url}`);
        }
        return undefined;
    }
    //#endregion (Graph) User requests
    //#region (D365) App requests
    public async getApps(fromCacheIfExisting: boolean, filter?: string): Promise<IFameApp[]> {
        if (fromCacheIfExisting) {
            let cachedValues = await this.getCachedValues<IFameApp[]>(<IFameApp[]>{});
            if (filter) {
                cachedValues = cachedValues.filter(element => element.name.includes(filter));
            }
            if (cachedValues) {
                return cachedValues;
            }
        }
        let resultArray = (await this.appRequestProvider.list()).value;
        console.log(resultArray);
        const namesMap = await ValueProvider.getMapFromCache(CACHE_IDNAMEMAP, this.cache);
        if (namesMap) {
            resultArray.map(entry => { entry.name = (namesMap.get(entry.id) as string); return entry; });
        }
        if (filter) {
            resultArray = resultArray.filter(element => element.name.includes(filter));
        }
        this.cache.put("v1", CACHE_FAMEAPPS, resultArray);
        return resultArray;
    }
    //#endregion (D365) App requests
    //#region (D365) Country requests
    public async getCountriesForApp(appId: string): Promise<IFameAppCountry[]> {
        let resultArray = await (await this.appCountryRequestProvider.list(appId)).value;
        console.log(resultArray);
        return resultArray;
    }
    public async addCountryForApp(appId: string, countryCode: string): Promise<IFameAppCountry> {
        let body = {
            countryCode: countryCode
        };
        let result = await this.appCountryRequestProvider.add(appId, countryCode, body);
        console.log(result);
        return result;
    }
    //#endregion (D365) Country requests
    //#region (D365) Principal requests
    public async getPrincipalsForApp(appId: string): Promise<IFameAppPrincipal[]> {
        let resultArray = await (await this.appPrincipalRequestProvider.list(appId)).value;
        // Add "name"-property to objects
        resultArray = await Promise.all(resultArray.map(async (entry): Promise<IFameAppPrincipal> => {
            entry.name = await this.getUsernameForId(entry.id) as string;
            return entry;
        }));
        console.log(resultArray);
        return resultArray;
    }
    public async addAppPrincipal(appId: string, principal: IPrincipal, roles: string[]) {
        const body = ApiProviderHelper.getPrincipalBody(principal, roles);
        let response = await this.appPrincipalRequestProvider.add(appId, principal.principalId, body);
        console.log(response);
    }
    public async updateAppPrincipal(appId: string, principal: IPrincipal, roles: string[]) {
        const body = ApiProviderHelper.getPrincipalBody(principal, roles);
        let response = await this.appPrincipalRequestProvider.update(appId, principal.principalId, body);
        console.log(response);
    }
    public async removeAppPrincipal(appId: string, principalId: string) {
        let response = await this.appPrincipalRequestProvider.remove(appId, principalId);
        console.log(response);
    }
    //#endregion (D365) Principal requests
    //#region (D365) Version requests
    public async getVersionsForApp(appId: string, countryCode: string, updateCache: boolean, filter?: string): Promise<IFameAppVersion[]> {
        let resultArray = await (await this.appVersionRequestProvider.list(appId, countryCode)).value;
        console.log(resultArray);
        if (updateCache === true) {
            await this.updateCachedApps(resultArray);
        }
        return resultArray;
    }
    public async addNewAppVersion(appId: string, countryCode: string, initialAvailability: string, fileContentBase64: string) {
        const allowedValues = ["Available", "Preview"];
        if (!allowedValues.includes(initialAvailability)) {
            throw Error("Not allowed value for 'initialAvailability'");
        }
        let body = {
            initialAvailability: initialAvailability,
            packageContents: fileContentBase64
        };
        // TODO: Validate that this works
        let response = await this.appVersionRequestProvider.add(appId, countryCode, body);
        console.log(response);
    }
    public async updateAppVersion(appId: string, countryCode: string, version: string, newAvailability?: string, dependencyAppId?: string, incompatibleFromVersion?: string) {
        if (newAvailability) {
            const allowedValues = ["Available", "Preview", "Deprecated"];
            if (!allowedValues.includes(newAvailability)) {
                throw Error("Not allowed value for 'Availability'");
            }
        }
        let body = {};
        if (newAvailability) {
            body = {
                availability: newAvailability
            };
        };
        if (dependencyAppId && incompatibleFromVersion) {
            body = {
                appId: dependencyAppId,
                incompatibleFromVersion: incompatibleFromVersion
            };
        }
        if (!body) {
            return;
        }
        let response = await this.appVersionRequestProvider.update(appId, countryCode, version, body); // XXX
        console.log(response);
    }
    public async downloadAppVersion(appId: string, countryCode: string, version: string, targetFolder?: string, filename?: string) {
        if (!filename) {
            filename = `${appId}-${version}`;
        }
        const response = await this.appVersionRequestProvider.download(appId, countryCode, version);
        const tempfile = await Utilities.saveAsTempFileFromStream(response, `${filename}.app`, false, targetFolder);
        console.log(tempfile);
        return tempfile;
    }
    //#endregion (D365) Version requests
    //#region (D365) Environment requests
    public async getEnvironmentsForApp(appId: string, countryCode: string, updateCache: boolean, filter?: string): Promise<IFameAppEnvironment[]> {
        let resultArray: IFameAppEnvironment[] = [];
        if (filter) {
            resultArray = await (await this.appEnvironmentRequestProvider.listFiltered(appId, countryCode, filter)).value;
        } else {
            resultArray = await (await this.appEnvironmentRequestProvider.list(appId, countryCode)).value;
        }
        console.log(resultArray);
        return resultArray;
    }
    public async getEnvironmentsForAppAsMap(appId: string, countryCode: string, updateCache: boolean): Promise<Map<string, IFameAppEnvironment>> {
        let resultArray = await this.getEnvironmentsForApp(appId, countryCode, updateCache);
        const resultMap = new Map<string, IFameAppEnvironment>();
        for (const [i, entry] of resultArray.entries()) {
            resultMap.set(entry.aadTenantId, entry);
        }
        return resultMap;
    }
    //#endregion (D365) Environment requests
    //#region (D365) Environment Hotfix requests
    public async getEnvironmentHotfixesForApp(appId: string, countryCode: string, environmentAadTenantId?: string, environmentName?: string): Promise<IFameAppEnvironmentHotifx[]> {
        let resultArray: IFameAppEnvironmentHotifx[] = [];
        let filter = undefined;
        let filters: string[] = [];
        if (environmentAadTenantId) {
            filters.push(`environmentAadTenantId eq ${environmentAadTenantId}`);
        }
        if (environmentName) {
            filters.push(`environmentName eq '${environmentName}'`);
        }
        if (filters.length > 0) {
            filter = filters.join(" and ");
        }
        if (filter) {
            resultArray = (await this.appEnvironmentHotifxRequestProvider.listFiltered(appId, countryCode, filter)).value;
        } else {
            resultArray = (await this.appEnvironmentHotifxRequestProvider.list(appId, countryCode)).value;
        }
        console.log(resultArray);
        return resultArray;
    }
    public async getEnvironmentHotfixForApp(appId: string, countryCode: string, id: string): Promise<IFameAppEnvironmentHotifx> {
        const result = await this.appEnvironmentHotifxRequestProvider.details(appId, countryCode, id);
        console.log(result);
        return result;
    }
    public async scheduleEnvironmentHotfixForApp(appId: string, countryCode: string, body: {}): Promise<IFameAppEnvironmentHotifx> {
        const result = await this.appEnvironmentHotifxRequestProvider.schedule(appId, countryCode, body);
        console.log(result);
        return result;
    }
    public async updateEnvironmentHotfixForApp(appId: string, countryCode: string, id: string, body: {}): Promise<IFameAppEnvironmentHotifx> {
        const result = await this.appEnvironmentHotifxRequestProvider.update(appId, countryCode, id, body);
        console.log(result);
        return result;
    }
    //#endregion (D365) Environment Hotfix requests

    private async updateCachedApps(versions: IFameAppVersion[]) {
        let cachedApps = await this.cache.get("v1", CACHE_FAMEAPPS) as IFameApp[];
        if (cachedApps && versions) {
            let updatedApps: IFameApp[] = [];
            for (const [i, app] of cachedApps.entries()) {
                for (const [i, version] of versions.entries()) {
                    if (app.id === version.appId) {
                        app.name = version.name;
                    }
                }
                updatedApps.push(app);
            }
            this.cache.put("v1", CACHE_FAMEAPPS, updatedApps);
            await ValueProvider.appsToIdNameMap(cachedApps, this.cache);
        }
    }
    public async collectInformationFromVersions() {
        let cachedApps = await this.cache.get("v1", CACHE_FAMEAPPS) as IFameApp[];
        if (!cachedApps) {
            cachedApps = await this.getApps(true);
            if (!cachedApps) {
                throw Error("Apps not loaded");
            }
        }
        let tempVersions: IFameAppVersion[] = [];
        apps:
        for (const [i, app] of cachedApps.entries()) {
            const countries = await this.getCountriesForApp(app.id);
            countries:
            for (const [i, country] of countries.entries()) {
                const appVersions = await this.getVersionsForApp(app.id, country.countryCode, false);
                versions:
                appVersions.reverse();
                for (const [i, version] of appVersions.entries()) {
                    if (version.name) {
                        tempVersions.push(version);
                        break countries;
                    }
                }
            }
        }
        await this.updateCachedApps(tempVersions);
    }
}