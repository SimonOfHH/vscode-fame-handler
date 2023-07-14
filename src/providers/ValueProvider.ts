import { AuthenticationResult } from "@azure/msal-node";
import * as vscode from 'vscode';
import { CACHE_IDNAMEMAP, CACHE_TOKEND365, CACHE_TOKENGRAPH, SETTINGS } from '../constants';
import { IFameApp, IPrincipalSets } from '../types';
import { CacheProvider } from './CacheProvider';
import exp = require('constants');

export class ValueProvider {
    public static async appsToIdNameMap(array: IFameApp[], cache: CacheProvider) {
        const map = new Map();
        for (const [i, entry] of array.entries()) {
            if (entry.name) {
                map.set(entry.id, entry.name);
            }
        }
        await this.putMapIntoCache(map, CACHE_IDNAMEMAP, cache);
        return map;
    }
    public static async putMapIntoCache(map: Map<string, string>, identifier: string, cache: CacheProvider) {
        // Don't let it expire (set year to 9999)
        let expiration = new Date();
        expiration.setFullYear(9999);
        await cache.put('v1', identifier, Object.fromEntries(map), expiration);
    }
    public static async getMapFromCache(identifier: string, cache: CacheProvider) {
        let mapRaw = await cache.get('v1', identifier);
        if (!mapRaw) { return; }
        const map = new Map<string, string>(Object.entries(mapRaw));
        return map;
    }
    public static async addNamesToApps(apps: IFameApp[], cache: CacheProvider) {
        const namesMap = await this.getMapFromCache(CACHE_IDNAMEMAP, cache);
        if (!namesMap) { return; }
        return apps.map(entry => { entry.name = (namesMap.get(entry.id) as string); return entry; });
    }
    public static getAzureSubscriptionId() {
        const subscriptionId = vscode.workspace.getConfiguration(SETTINGS.key).get<string>(SETTINGS.azureSubscriptionId);
        if (subscriptionId) {
            return subscriptionId;
        }
        return undefined;
    }
    public static getDefaultPrincipalsFromConfiguration() {
        const sets = vscode.workspace.getConfiguration(SETTINGS.key).get<IPrincipalSets>(SETTINGS.principalSets);
        if (sets) {
            return sets.defaults;
        }
        return undefined;
    }
    public static async getTokenLifetimeFromCache1(cache: CacheProvider) {
        let tokend365 = await cache.get('v1', CACHE_TOKEND365) as AuthenticationResult;
        let tokengraph = await cache.get('v1', CACHE_TOKENGRAPH) as AuthenticationResult;
        if ((!tokend365) || this.tokenIsExpired(tokend365) || this.tokenIsExpired(tokengraph)) {
            return `FAME: Not signed in`;
        }
        const diff = ValueProvider.dateDiffInMiliseconds(new Date(), (new Date(tokend365.expiresOn as Date)));
        return `FAME Token Lifetime: ${this.getTokenRemainingLifeTimeFormatted(tokend365)} / ${this.getTokenRemainingLifeTimeFormatted(tokengraph)}`;
    }
    public static tokenIsExpired(token: AuthenticationResult) {
        if (token.expiresOn !== null) {
            if (this.dateIsExpired(new Date(token.expiresOn))) {
                return true;
            }
        } else {
            return true;
        }
        return false;
    }
    private static dateIsExpired(d: Date) {
        if (d > new Date()) {
            return false;
        }
        return true;
    }
    private static getTokenRemainingLifeTimeFormatted(token: AuthenticationResult) {
        return this.getFormattedDuration(this.getTokenRemainingLifeTime(token));
    }
    private static getTokenRemainingLifeTime(token : AuthenticationResult) {
        return ValueProvider.dateDiffInMiliseconds(new Date(), (new Date(token.expiresOn as Date)));
    }
    private static getFormattedDuration(value: number) {
        var date = new Date(0);
        date.setMilliseconds(value);
        return date.toISOString().substring(11, 19);
    }
    private static dateDiffInMiliseconds(a: Date, b: Date) {
        // Discard the time and time-zone information.        
        const utc1 = this.dateToUtc(a);
        const utc2 = this.dateToUtc(b);

        return Math.floor((utc2 - utc1));
    }
    private static dateToUtc(d: Date) {
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    }
}