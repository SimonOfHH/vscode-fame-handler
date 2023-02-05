import axios, { AxiosResponse } from "axios";
import { SETTINGS } from "../constants";
import { IFameApp, IFameAppArray, IFameAppCountry, IFameAppCountryArray, IFameAppEnvironment, IFameAppEnvironmentArray, IFameAppPrincipal, IFameAppPrincipalArray, IFameAppVersion, IFameAppVersionArray, IGraphUser, IGraphUserArray, IPrincipal } from '../types';
import { getConfigurationValue } from "./Helper";

export class AxiosHelper {
    private static responseBody = <T>(response: AxiosResponse<T>) => response.data;
    private static request = {
        get: <T>(url: string) => axios.get<T>(url).then(this.responseBody),
        post: <T>(url: string, body: {}) =>
            //axios.post<T>(url, body).then(this.responseBody), // TODO: activate for next real test
            console.log(`POST url: ${url}; body: ${body}`),
        post2: <T>(url: string, body: {}) =>
            axios.post<T>(url, body).then(this.responseBody),
        patch: <T>(url: string, body: {}) =>
            axios.patch<T>(url, body).then(this.responseBody),
        delete: <T>(url: string) =>
            axios.delete<T>(url).then(this.responseBody)
    };
    public static userRequest = {
        list: () => this.request.get<IGraphUserArray>('/users'),
        listFilter: (filter?: string) => this.request.get<IGraphUserArray>(`/users/?${filter}`),
        details: (id: string) => this.request.get<IGraphUser>(`/users/${id}`)
    };
    public static appsRequest = {
        list: () => this.request.get<IFameAppArray>(''),
        details: (id: string) => this.request.get<IFameApp>(`/${id}`)
    };
    public static appCountriesRequest = {
        list: (appId: string) => this.request.get<IFameAppCountryArray>(`/${appId}/countries`),
        details: (appId: string, id: string) => this.request.get<IFameAppCountry>(`/${appId}/countries/${id}`)
    };
    public static appPrincipalsRequest = {
        list: (appId: string) => this.request.get<IFameAppPrincipalArray>(`/${appId}/principals`),
        add: (appId: string, id: string, body: {}) => this.request.patch<IFameAppPrincipalArray>(`/${appId}/principals/${id}`, body),
        details: (appId: string, id: string) => this.request.get<IFameAppPrincipal>(`/${appId}/principals/${id}`),
        delete: (appId: string, id: string) => this.request.delete<IFameAppPrincipal>(`/${appId}/principals/${id}`)
    };
    public static appVersionsRequest = {
        list: (appId: string, countryCode: string, filter?: string) => this.request.get<IFameAppVersionArray>(`/${appId}/countries/${countryCode}/versions${(filter) ? `?filter=${filter}` : ""}`),
        add: (appId: string, countryCode: string, body: {}) => this.request.post<IFameAppVersion>(`/${appId}/countries/${countryCode}/versions`, body),
        download: (appId: string, countryCode: string, version: string) => this.request.post2(`/${appId}/countries/${countryCode}/versions/${version}/getPackageContents `, {})
    };
    public static appEnvironmentsRequest = {
        list: (appId: string, countryCode: string) => this.request.get<IFameAppEnvironmentArray>(`/${appId}/countries/${countryCode}/environments`),
        listFiltered: (appId: string, countryCode: string, filter: string) => this.request.get<IFameAppEnvironmentArray>(`/${appId}/countries/${countryCode}/environments?&filter=${filter}`),
        details: (appId: string, countryCode: string, id: string) => this.request.get<IFameAppEnvironment>(`/${appId}/countries/${countryCode}/environments/${id}`)
    };
    public static getPrincipalBody = (principal: IPrincipal, roles: string[]) => {
        if (principal.principalType.toLowerCase() === "user") {
            return {
                "aadTenantId": getConfigurationValue(SETTINGS.d365ApiTenantId),
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