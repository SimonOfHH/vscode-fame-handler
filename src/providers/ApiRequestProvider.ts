import axios, { AxiosResponse } from "axios";
import { CacheProvider } from '../providers';
import { IFameApp, IFameAppArray, IFameAppCountry, IFameAppCountryArray, IFameAppEnvironment, IFameAppEnvironmentArray, IFameAppEnvironmentHotifx, IFameAppEnvironmentHotifxArray, IFameAppPrincipal, IFameAppPrincipalArray, IFameAppVersion, IFameAppVersionArray, IGraphUser, IGraphUserArray } from '../types';
import { ApiProviderHelper, ApiType } from "../utils";

class ApiRequestProvider {
    private cache: CacheProvider;
    private apiType: ApiType;
    private responseBody = <T>(response: AxiosResponse<T>) => response.data;

    constructor(type: ApiType, cache: CacheProvider) {
        this.apiType = type;
        this.cache = cache;
    }
    protected async get<T>(url: string): Promise<T> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, this.apiType);
        console.log(url);
        return axios.get<T>(url).then(this.responseBody);
    }
    protected async post<T>(url: string, body: {}): Promise<T> {
        return this.postPlaceholder(url, body); // TODO: Remove with next test
        await ApiProviderHelper.configureAxiosInstance(this.cache, this.apiType);
        return axios.post<T>(url, body).then(this.responseBody);
    }
    protected async post1<T>(url: string, body: {}): Promise<T> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, this.apiType);
        return axios.post<T>(url, body).then(this.responseBody);
    }
    protected async postPlaceholder<T>(url: string, body: {}): Promise<T> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, this.apiType);
        console.log(`POST url: ${url}; body: ${body}`);
        return {} as T;
    }
    protected async postStreamResponse<T>(url: string): Promise<T> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, this.apiType);
        return axios.post<T>(url, undefined, { responseType: "stream" }).then<T>(this.responseBody);
    }
    protected async patch<T>(url: string, body: {}): Promise<T> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, this.apiType);
        return axios.patch<T>(url, body).then(this.responseBody);
    }
    protected async patchPlaceholder<T>(url: string, body: {}): Promise<T> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, this.apiType);
        console.log(`PATCH url: ${url}; body: ${body}`);
        return {} as T;
    }
    protected async delete<T>(url: string): Promise<T> {
        await ApiProviderHelper.configureAxiosInstance(this.cache, this.apiType);
        return axios.delete<T>(url).then(this.responseBody);
    }
}
export class AppRequestProvider extends ApiRequestProvider {
    constructor(cache: CacheProvider) {
        super(ApiType.D365, cache);
    }
    public async list(): Promise<IFameAppArray> {
        return this.get<IFameAppArray>('');
    }
    public async details(id: string): Promise<IFameApp> {
        return this.get<IFameApp>(`/${id}`);
    }
}
export class AppCountryRequestProvider extends ApiRequestProvider {
    constructor(cache: CacheProvider) {
        super(ApiType.D365, cache);
    }
    public async list(appId: string): Promise<IFameAppCountryArray> {
        return this.get<IFameAppCountryArray>(`/${appId}/countries`);
    }
    public async details(appId: string, id: string): Promise<IFameAppCountry> {
        return this.get<IFameAppCountry>(`/${appId}/countries/${id}`);
    }
    public async add(appId: string, id: string, body: {}): Promise<IFameAppCountry> {
        return this.patchPlaceholder<IFameAppCountry>(`/${appId}/countries/${id}`, body);
    }
}
export class AppPrincipalRequestProvider extends ApiRequestProvider {
    constructor(cache: CacheProvider) {
        super(ApiType.D365, cache);
    }
    public async list(appId: string): Promise<IFameAppPrincipalArray> {
        return this.get<IFameAppPrincipalArray>(`/${appId}/principals`);
    }
    public async details(appId: string, id: string): Promise<IFameAppCountry> {
        return this.get<IFameAppCountry>(`/${appId}/principals/${id}`);
    }
    public async add(appId: string, id: string, body: {}): Promise<IFameAppPrincipal> {
        return this.patch<IFameAppPrincipal>(`/${appId}/principals/${id}`, body);
    }
    public async update(appId: string, id: string, body: {}): Promise<IFameAppPrincipal> {
        return this.patch<IFameAppPrincipal>(`/${appId}/principals/${id}`, body);
    }
    public async remove(appId: string, id: string): Promise<IFameAppPrincipal> {
        return this.delete<IFameAppPrincipal>(`/${appId}/principals/${id}`);
    }
}
export class AppVersionRequestProvider extends ApiRequestProvider {
    constructor(cache: CacheProvider) {
        super(ApiType.D365, cache);
    }
    public async list(appId: string, countryCode: string, filter?: string): Promise<IFameAppVersionArray> {
        return this.get<IFameAppVersionArray>(`/${appId}/countries/${countryCode}/versions${(filter) ? `?filter=${filter}` : ""}`);
    }
    public async details(appId: string, countryCode: string, version: string): Promise<IFameAppVersion> {
        return this.get<IFameAppVersion>(`/${appId}/countries/${countryCode}/versions/${version}`);
    }
    public async add(appId: string, countryCode: string, body: {}): Promise<IFameAppVersion> {
        return this.post1<IFameAppVersion>(`/${appId}/countries/${countryCode}/versions`, body);
    }
    public async update(appId: string, countryCode: string, version: string, body: {}): Promise<IFameAppVersion> {
        return this.patchPlaceholder<IFameAppVersion>(`/${appId}/countries/${countryCode}/versions/${version}`, body);
    }
    public async download(appId: string, countryCode: string, version: string): Promise<IFameAppVersion> {
        return this.postStreamResponse<IFameAppVersion>(`/${appId}/countries/${countryCode}/versions/${version}/getPackageContents`);
    }
}
export class AppEnvironmentRequestProvider extends ApiRequestProvider {
    constructor(cache: CacheProvider) {
        super(ApiType.D365, cache);
    }
    public async list(appId: string, countryCode: string): Promise<IFameAppEnvironmentArray> {
        return this.get<IFameAppEnvironmentArray>(`/${appId}/countries/${countryCode}/environments`);
    }
    public async listFiltered(appId: string, countryCode: string, filter: string): Promise<IFameAppEnvironmentArray> {
        return this.get<IFameAppEnvironmentArray>(`/${appId}/countries/${countryCode}/environments?&filter=${filter}`);
    }
    public async details(appId: string, countryCode: string, id: string): Promise<IFameAppEnvironment> {
        return this.get<IFameAppEnvironment>(`/${appId}/countries/${countryCode}/environments/${id}`);
    }
}
export class AppEnvironmentHotfixRequestProvider extends ApiRequestProvider {
    constructor(cache: CacheProvider) {
        super(ApiType.D365, cache);
    }
    public async list(appId: string, countryCode: string): Promise<IFameAppEnvironmentHotifxArray> {
        return this.get<IFameAppEnvironmentHotifxArray>(`/${appId}/countries/${countryCode}/environmentHotfixes`);
    }
    public async listFiltered(appId: string, countryCode: string, filter: string): Promise<IFameAppEnvironmentHotifxArray> {
        return this.get<IFameAppEnvironmentHotifxArray>(`/${appId}/countries/${countryCode}/environmentHotfixes?&filter=${filter}`);
    }
    public async details(appId: string, countryCode: string, id: string): Promise<IFameAppEnvironmentHotifx> {
        return this.get<IFameAppEnvironmentHotifx>(`/${appId}/countries/${countryCode}/environmentHotfixes/${id}`);
    }
    public async schedule(appId: string, countryCode: string, body: {}): Promise<IFameAppEnvironmentHotifx> {
        // TODO: Validate body here?
        return this.postPlaceholder<IFameAppEnvironmentHotifx>(`/${appId}/countries/${countryCode}/environmentHotfixes`, body); // TODO: Activate
    }
    public async update(appId: string, countryCode: string, id: string, body: {}): Promise<IFameAppEnvironmentHotifx> {
        // TODO: Validate body here?
        return this.patchPlaceholder<IFameAppEnvironmentHotifx>(`/${appId}/countries/${countryCode}/environmentHotfixes/${id}`, body); // TODO: Activate
    }
}
export class UserRequestProvider extends ApiRequestProvider {
    constructor(cache: CacheProvider) {
        super(ApiType.Graph, cache);
    }
    public async list(): Promise<IGraphUserArray> {
        return this.get<IGraphUserArray>('/users');
    }
    public async listFiltered(filter?: string): Promise<IGraphUserArray> {
        return this.get<IGraphUserArray>(`/users/?${filter}`);
    }
    public async details(id: string): Promise<IGraphUser> {
        return this.get<IGraphUser>(`/users/${id}`);
    }
}