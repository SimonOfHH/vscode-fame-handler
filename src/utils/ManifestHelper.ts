import { ApiProvider } from "../providers";
import { IManifestAppEntry } from "../types";
import * as semver from 'semver';

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
        result.appProblems = await this.getAppProblems();
        return result;
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
    private static async validateAppEntry(entryId: number, appEntry: IManifestAppEntry, apiProvider: ApiProvider): Promise<string[] | undefined> {
        let problems: string[] = [];
        const identifier = `id=${appEntry.id}, name=${appEntry.name}`;
        if (!appEntry.id) {
            problems.push(`${entryId}: "appId" is missing (${identifier})`);
        }
        if (!appEntry.initialVersion) {
            problems.push(`${entryId}: "initialVersion" is missing (${identifier})`);
        }
        if (!appEntry.name) {
            problems.push(`${entryId}: "name" is missing (${identifier})`);
        }
        if (!appEntry.publisher) {
            problems.push(`${entryId}: "publisher" is missing (${identifier})`);
        }
        if (!appEntry.allowedUpdates) {
            problems.push(`${entryId}: "allowedUpdates" is missing (${identifier})`);
        }
        if ((appEntry.id) && (appEntry.initialVersion)) {
            const filter = ManifestHelper.getVersionFilter(appEntry);
            if (!filter) { problems.push(`${entryId}: "Couldn't parse version (${identifier})`); }
            try {
                const result = await apiProvider.getVersionsForApp(appEntry.id, "DE", false, filter); // TODO: Make countryCode dynamic
                if (!result) { problems.push(`${entryId}: "Couldn't find version in FAME repository (${identifier})`); }
            } catch {
                problems.push(`${entryId}: "Couldn't find version in FAME repository (HTTP error) (${identifier})`);
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
    constructor() {
        this.appProblems = undefined;
    }
    public hasProblems() {
        if (!this.appProblems) { return false; }
        if (this.appProblems.size === 0) { return false; }
        return true;
    }
    public getOutput(): string | undefined {
        let output: string = "";
        if (this.appProblems) {
            output = output.concat("App section\n===========================\n");
            output = output.concat(this.getSortedOutput(this.appProblems));
            output = output.concat("\n===========================\n");
        }
        return output;
    }
    private getSortedOutput(problems: Map<number, string[]>) {
        const sortedMap = new Map([...problems.entries()].sort());
        return Array.from(sortedMap.values()).join("\n");
    }
}