import { PublicClientApplication } from "@azure/msal-node";
import { AxiosError } from "axios";
import { ExtensionContext } from 'vscode';
import { CACHE_FAMEAPPS, CACHE_IDNAMEMAP, CACHE_NAME } from '../constants';
import { CacheProvider, CommandProvider, ValueProvider } from '../providers';
import { IFameApp, IFameAppCountry, IFameAppEnvironment, IFameAppPrincipal, IFameAppVersion, IGraphUser, IPrincipal } from '../types';
import { ApiProviderHelper, ApiType, AxiosHelper, Utilities } from "../utils";

export class ApiProvider {
    private cache: CacheProvider;
    private pca = new PublicClientApplication(ApiProviderHelper.getAuthConfig());
    private cachedPrincipalInformation: Map<string, IGraphUser> = new Map();
    private cmdProvider: CommandProvider;

    constructor(context: ExtensionContext, cmdProvider: CommandProvider) {
        this.cache = CacheProvider.getInstance(context, CACHE_NAME, { v1: {}, beta: {} });
        this.cmdProvider = cmdProvider;
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
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.Graph);
        let filter = "";
        if (userNameFilter) {
            filter = `$filter=startswith(displayName, '${userNameFilter}')`;
        }
        let resultArray: IGraphUser[] = [];
        if (userNameFilter) {
            resultArray = (await AxiosHelper.userRequest.listFilter(filter)).value;
        }
        else {
            resultArray = (await AxiosHelper.userRequest.list()).value;
        }
        return resultArray;
    }
    public async getUserDetails(userId: string): Promise<IGraphUser | undefined> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.Graph);
        try {
            let result = await AxiosHelper.userRequest.details(userId);
            this.cachedPrincipalInformation.set(userId, result);
            return result;
        }
        catch (e) {
            const ae = e as AxiosError;
            console.log(`Error for: ${ae.config?.baseURL}${ae.config?.url}`);
        }
        return undefined;
    }
    public async getFameApps(fromCacheIfExisting: boolean, filter?: string): Promise<IFameApp[]> {
        if (fromCacheIfExisting) {
            let cachedValues = await this.getCachedValues<IFameApp[]>(<IFameApp[]>{});
            if (filter) {
                cachedValues = cachedValues.filter(element => element.name.includes(filter));
            }
            if (cachedValues) {
                return cachedValues;
            }
        }
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        let resultArray = await (await AxiosHelper.appsRequest.list()).value;
        console.log(resultArray);
        const namesMap = await ValueProvider.getMapFromCache(CACHE_IDNAMEMAP, this.cmdProvider);
        if (namesMap) {
            resultArray.map(entry => { entry.name = (namesMap.get(entry.id) as string); return entry; });
        }
        if (filter) {
            resultArray = resultArray.filter(element => element.name.includes(filter));
        }
        this.cache.put("v1", CACHE_FAMEAPPS, resultArray);
        return resultArray;
    }
    public async getCountriesForApp(appId: string): Promise<IFameAppCountry[]> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        let resultArray = await (await AxiosHelper.appCountriesRequest.list(appId)).value;
        console.log(resultArray);
        return resultArray;
    }
    public async addCountryForApp(appId: string, countryCode: string): Promise<IFameAppCountry> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        let body = {
            countryCode: countryCode
        };
        let result = await AxiosHelper.appCountriesRequest.add(appId, countryCode, body);
        console.log(result);
        return result;
    }
    public async getPrincipalsForApp(appId: string): Promise<IFameAppPrincipal[]> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        let resultArray = await (await AxiosHelper.appPrincipalsRequest.list(appId)).value;
        // Add "name"-property to objects
        resultArray = await Promise.all(resultArray.map(async (entry): Promise<IFameAppPrincipal> => {
            entry.name = await this.getUsernameForId(entry.id) as string;
            return entry;
        }));
        console.log(resultArray);
        return resultArray;
    }
    public async getVersionsForApp(appId: string, countryCode: string, updateCache: boolean, filter?: string): Promise<IFameAppVersion[]> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        let resultArray = await (await AxiosHelper.appVersionsRequest.list(appId, countryCode)).value;
        console.log(resultArray);
        if (updateCache === true) {
            await this.updateCachedApps(resultArray);
        }
        return resultArray;
    }
    public async getEnvironmentsForApp(appId: string, countryCode: string, updateCache: boolean, filter?: string): Promise<IFameAppEnvironment[]> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        let resultArray: IFameAppEnvironment[] = [];
        if (filter) {
            resultArray = await (await AxiosHelper.appEnvironmentsRequest.listFiltered(appId, countryCode, filter)).value;
        } else {
            resultArray = await (await AxiosHelper.appEnvironmentsRequest.list(appId, countryCode)).value;
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
            await ValueProvider.appsToIdNameMap(cachedApps, this.cmdProvider);
        }
    }
    public async collectInformationFromVersions() {
        let cachedApps = await this.cache.get("v1", CACHE_FAMEAPPS) as IFameApp[];
        if (!cachedApps) {
            cachedApps = await this.getFameApps(true);
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
        this.cmdProvider.currTreeProvider.refresh();
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
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        // TODO: Validate that this works
        let response = await AxiosHelper.appVersionsRequest.add(appId, countryCode, body);
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
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        // TODO: activate
        //let response = await AxiosHelper.appVersionsRequest.update(appId, countryCode, version, body);
        //console.log(response);
    }
    public async downloadAppVersion(appId: string, countryCode: string, version: string, targetFolder?: string, filename?: string) {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        if (!filename) {
            filename = `${appId}-${version}`;
        }
        const response = await AxiosHelper.appVersionsRequest.download(appId, countryCode, version);
        const tempfile = await Utilities.saveAsTempFileFromStream(response, `${filename}.app`, false, targetFolder);
        console.log(tempfile);
        return tempfile;
    }
    public async addAppPrincipal(appId: string, principal: IPrincipal, roles: string[]) {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        const body = AxiosHelper.getPrincipalBody(principal, roles);
        let response = await AxiosHelper.appPrincipalsRequest.add(appId, principal.principalId, body);
        console.log(response);
    }
    public async updateAppPrincipal(appId: string, principal: IPrincipal, roles: string[]) {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        const body = AxiosHelper.getPrincipalBody(principal, roles);
        let response = await AxiosHelper.appPrincipalsRequest.update(appId, principal.principalId, body);
        console.log(response);
    }
    public async removeAppPrincipal(appId: string, principalId: string) {
        await ApiProviderHelper.configureAxiosInstance(this.cache, ApiType.D365);
        let response = await AxiosHelper.appPrincipalsRequest.delete(appId, principalId);
        console.log(response);
    }
}