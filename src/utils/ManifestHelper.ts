import axios from 'axios';
import * as semver from 'semver';
import { table, TableUserConfig } from 'table';
import { ApiProvider } from "../providers";
import { IManifestAppEntry, IManifestLinks } from "../types";

export class ManifestHelper {
    // TODO: Validate rest of Manifest.json
    private _rawContent: string;
    private _apiProvider: ApiProvider;
    private _asJson: any;
    constructor(rawContent: string, apiProvider: ApiProvider) {
        this._rawContent = rawContent;
        this._apiProvider = apiProvider;
        this._asJson = JSON.parse(this._rawContent);
    }
    public async validate() {
        let result = new ManifestValidationResult();
        result.linkProblems = await this.getLinkProblems();
        result.appProblems = await this.getAppProblems();
        return result;
    }
    private async getLinkProblems(): Promise<Map<number, string[]> | undefined> {
        let problemsMap: Map<number, string[]> = new Map<number, string[]>();
        const links = this.getLinks();
        const linksAsArray = Object.entries(links);
        await Promise.all(linksAsArray.map(async (entry, index) => {
            const linkProblems = await ManifestHelper.validateLink(entry[0], entry[1]);
            if (linkProblems) {
                problemsMap.set(index, linkProblems);
            }
        }));
        return problemsMap;
    }
    private async getAppProblems(): Promise<Map<number, string[]> | undefined> {
        let problemsMap: Map<number, string[]> = new Map<number, string[]>();
        const apps = this.getParsedApps();
        await Promise.all(apps.map(async (entry, index) => {
            const appProblems = await ManifestHelper.validateAppEntry(index, entry, this._apiProvider);
            if (appProblems) {
                problemsMap.set(index, appProblems);
            }
        }));
        if (problemsMap.size === 0) { return undefined; }
        return problemsMap;
    }
    private getParsedApps(): IManifestAppEntry[] {
        return this._asJson["apps"] as IManifestAppEntry[];
    }
    private getLinks(): IManifestLinks {
        return this._asJson["links"] as IManifestLinks;
    }
    private static async validateLink(identifier: string, link: string): Promise<string[] | undefined> {
        let problems: string[] = [];
        if (link.includes("FIX")) {
            problems.push(`${identifier} seems to contain a placeholder.`);
        }
        // TODO: Validate more?
        const http = axios.create({});
        http.get(link).catch(function (error) {
            if (error.response) {
                problems.push(`${identifier} couldn't be reached (${error.response.status} ${error.response.statusText}).`);
            } else if (error.request) {
                problems.push(`${identifier} couldn't be reached (${error.message}).`);
            } else {
                problems.push(`${identifier} couldn't be reached (${error.message}).`);
            }
        });
        if (problems.length === 0) { return undefined; };
        return problems;
    }
    private static async validateAppEntry(entryId: number, appEntry: IManifestAppEntry, apiProvider: ApiProvider): Promise<string[] | undefined> {
        let problems: string[] = [];
        const identifier = `id=${appEntry.id}, name=${appEntry.name}`;
        if (!appEntry.id) {
            problems.push(`"appId" is missing (${identifier})`);
        }
        if (!appEntry.initialVersion) {
            problems.push(`"initialVersion" is missing (${identifier})`);
        }
        if (!appEntry.name) {
            problems.push(`"name" is missing (${identifier})`);
        }
        if (!appEntry.publisher) {
            problems.push(`"publisher" is missing (${identifier})`);
        }
        if (!appEntry.allowedUpdates) {
            problems.push(`"allowedUpdates" is missing (${identifier})`);
        }
        if ((appEntry.id) && (appEntry.initialVersion)) {
            const filter = ManifestHelper.getVersionFilter(appEntry);
            if (!filter) { problems.push(`"Couldn't parse version (${identifier})`); }
            try {
                const result = await apiProvider.getVersionsForApp(appEntry.id, "DE", false, filter); // TODO: Make countryCode dynamic
                if (!result) { problems.push(`"Couldn't find version in FAME repository (${identifier})`); }
            } catch {
                problems.push(`"Couldn't find version in FAME repository (HTTP error) (${identifier})`);
            }
        }
        if (problems.length === 0) { return undefined; };
        return problems;
    }
    private static getVersionFilter(appEntry: IManifestAppEntry): string | undefined {
        const version = semver.coerce(appEntry.initialVersion);
        if (!version) { return undefined; }
        return `MajorVersion eq ${version.major} and MinorVersion eq ${version.minor}`;
    }
}
export class ManifestValidationResult {
    public appProblems: Map<number, string[]> | undefined;
    public linkProblems: Map<number, string[]> | undefined;

    constructor() {
        this.appProblems = undefined;
        this.linkProblems = undefined;
    }
    public hasProblems() {
        if ((!this.appProblems) && (!this.linkProblems)) { return false; }
        if ((this.appProblems?.size === 0) && (this.linkProblems?.size === 0)) { return false; }
        return true;
    }
    public getOutput(): string | undefined {
        let output: string = "";
        if (this.linkProblems) {
            const outputLinks = ManifestValidationResult.getLinkProblemsAsFormattedTable(this.linkProblems);
            output = output.concat(outputLinks);
        }
        if (this.appProblems) {
            const outputApps = ManifestValidationResult.getAppProblemsAsFormattedTable(this.appProblems);
            output = output.concat(outputApps);
        }
        return output;
    }
    private static getAppProblemsAsFormattedTable(problems: Map<number, string[]>) {
        const config: TableUserConfig = {
            header: {
                alignment: 'center',
                content: 'App-section',
            },
        };
        const data = [["App Entry", "Error No.", "Message"]];
        this.getSortedOutput(problems).forEach((value: string[], key: number, map: Map<number, string[]>) => {
            value.forEach((value, index) => {
                data.push([key.toString(), index.toString(), value]);
            });
        });
        return table(data, config);
    }
    private static getLinkProblemsAsFormattedTable(problems: Map<number, string[]>) {
        const config: TableUserConfig = {
            header: {
                alignment: 'center',
                content: 'Links-section',
            },
        };
        const data = [["Link", "Error No.", "Message"]];
        this.getSortedOutput(problems).forEach((value: string[], key: number, map: Map<number, string[]>) => {
            value.forEach((value, index) => {
                data.push([key.toString(), index.toString(), value]);
            });
        });
        return table(data, config);
    }
    private static getSortedOutput(problems: Map<number, string[]>) {
        return new Map([...problems.entries()].sort());
    }
}