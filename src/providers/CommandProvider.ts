import * as vscode from 'vscode';
import { CACHE_FAMEAPPS, CACHE_IDNAMEMAP, CACHE_NAME, SETTINGS } from '../constants';
import { ApiProvider, AppVersionDialogueProvider, CacheProvider, EnvironmentHotfixDialogueProvider, FameTreeProvider, LcsBuildProvider, PrincipalSelectProvider, SortingType, ValueProvider } from '../providers';
import { FameAppCountrySubEntityVersionsTreeItem, FameAppEnvironmentHotfixTreeItem, FameAppEnvironmentTreeItem, FameAppPrincipalTreeItem, FameAppSubEntityPrincipalsTreeItem, FameAppTreeItem, FameAppVersionTreeItem } from '../types';
import { IFameApp, IFameAppEnvironment, IFameAppVersion } from '../types/FameTypes';
import { ApiProviderHelper, ApiType, AzureUtils, ManifestHelper, NavxHelper, Utilities } from '../utils';

export class CommandProvider {
    public apiProvider: ApiProvider;
    public currContext: vscode.ExtensionContext;
    public currTreeProvider: FameTreeProvider;

    constructor(context: vscode.ExtensionContext) {
        this.apiProvider = new ApiProvider(context, this);
        this.currContext = context;
        this.currTreeProvider = new FameTreeProvider(this);
    }
    public signInCommand = async () => {
        this.apiProvider.signIn(ApiType.D365);
        this.apiProvider.signIn(ApiType.Graph);
    };
    public statusBarUpdateCommand = async (tokenInfoStatusBarItem: vscode.StatusBarItem) => {
        //tokenInfoStatusBarItem.text = await ValueProvider.getTokenLifetimeFromCache1(CacheProvider.getInstance(this.currContext, CACHE_NAME));
        tokenInfoStatusBarItem.text = "deactivated";
        tokenInfoStatusBarItem.show();
    };
    public importAppIdNameMapCommand = async () => {
        let cbContent = await vscode.env.clipboard.readText();
        if (!cbContent.startsWith('{') || !cbContent.endsWith('}')) {
            cbContent = "";
        }
        const placeholder = "{\"00000000-0000-0000-0000-00000000000\":\"App Name 1\",\"00000001-0001-0001-0001-00000000001\":\"App Name 2\",...}";
        const prompt = "Enter JSON to import";
        const searchQuery = await vscode.window.showInputBox({
            placeHolder: placeholder,
            prompt: prompt,
            value: cbContent
        });
        if (!searchQuery) {
            return;
        }
        const map = new Map<string, string>(Object.entries(JSON.parse(searchQuery as string)));
        ValueProvider.putMapIntoCache(map, CACHE_IDNAMEMAP, CacheProvider.getInstance(this.currContext, CACHE_NAME));
    };
    public exportAppIdNameMapCommand = async () => {
        const cache: CacheProvider = CacheProvider.getInstance(this.currContext, CACHE_NAME);
        let cachedApps = await cache.get("v1", CACHE_FAMEAPPS) as IFameApp[];
        let map = await ValueProvider.appsToIdNameMap(cachedApps, cache);
        vscode.env.clipboard.writeText(JSON.stringify(Object.fromEntries(map)));
        vscode.window.showInformationMessage(`Copied to clipboard.`);
    };
    public uploadAppVersionCommand = async (version: FameAppCountrySubEntityVersionsTreeItem) => {
        if (await this.checkSignedIn() === false) { return; }
        const file = await Utilities.selectFileDialog();
        if (file) {
            const navx = await NavxHelper.async(file);
            // TODO: Check if more properties need to be validated
            if (navx.getAppValue("Id") !== version.appItem.id) {
                vscode.window.showErrorMessage(`ID from selected app file and selected version do not match. Currently selected is ${version.appItem.id}, but the file contains ${navx.getAppValue("Id")}`);
                return;
            }
            const base64content = Utilities.getFileBytesAsBase64(file);
            let response = await this.apiProvider.addNewAppVersion(version.appItem.id, version.appCountry.countryCode, "Available", base64content);
            vscode.window.showInformationMessage(`Successfully uploaded file: ${file} (Response: ${response}).`);
        }
    };
    public loadAllAppsCommand = async () => {
        if (await this.checkSignedIn() === false) { return; }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: true,
            title: 'FAME Loading app metadata'
        }, async (progress, token) => {
            await this.apiProvider.collectInformationFromVersions(progress, token);
        });
        this.currTreeProvider.refresh();
    };
    public uploadAppsFromDirectoryCommand = async () => {
        if (await this.checkSignedIn() === false) { return; }
        const folder = await Utilities.selectFolderDialog();
        if (!folder) { return; }
        // Ask for country        
        const countryCode = await AppVersionDialogueProvider.selectCountryCode(); 
        if (!countryCode) { return; }
        // Get all files
        const files = await Utilities.getFilesForDirectory(folder);
        let [appsInfos, idInfos] = await Utilities.getAppMaps(files);
        // Sort apps by dependencies
        appsInfos = Utilities.sortMapByNumberOfEntriesInArrayNavX(appsInfos);
        const appsSorted = Utilities.sortMapByDependencies(appsInfos, idInfos);
        // Check if all apps can be uploaded
        await Utilities.validatePreconditionnsBeforeUpload(appsSorted, countryCode, this.apiProvider);
        // Upload file-by-file
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
            title: `Uploading apps (Country: ${countryCode})`
        }, async (progress) => {
            for (const [entry, content] of appsSorted) {
                const base64content = Utilities.getFileBytesAsBase64(content.sourceFilename);
                const appId = content.getAppValue("Id");
                const appName = content.getAppValue("Name");
                const appVersion = content.getAppValue("Version");
                progress.report({ message: `${appName}, ${appVersion}` });
                const response = await this.apiProvider.addNewAppVersion(appId, countryCode, "Available", base64content);
            }
        });
    };
    public clearCacheProviderCommand = async () => {
        const cache: CacheProvider = CacheProvider.getInstance(this.currContext, CACHE_NAME);
        cache.clear();
    };
    public assignAppToCountryCommand = async (app: FameAppTreeItem) => {
        // TODO: Validate 
        // https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/administration/appmanagement/app-management-api#add-or-update-country
        const countries = Utilities.getConfigurationValue(SETTINGS.countrySelection) as string[];
        if (!countries || countries.length === 0) {
            vscode.window.showInformationMessage(`You need to provide a list of possible countries in the setting ${SETTINGS.countrySelection}.`);
            return;
        }
        const countryCode = await vscode.window.showQuickPick(countries, {
            placeHolder: '...',
            title: 'Select country'
        });
        if (!countryCode) { return; }
        // TODO: Should countryCode be validated? Maybe against list of assigned country codes? see https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements
        vscode.window.showWarningMessage(`Are you sure that you want to assign app "${app.appItem.name} to country "${countryCode}"? This can't be undone."`, "Yes", "No").
            then(async (answer) => {
                if (answer === "Yes") {
                    await this.apiProvider.addCountryForApp(app.appItem.id, countryCode);
                    vscode.window.showInformationMessage(`Assigned country "${countryCode}" to app "${app.appItem.name}"`);
                    this.currTreeProvider.refresh();
                }
            });
    };
    public updateAppVersionCommand = async (version: FameAppVersionTreeItem) => {
        // https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/administration/appmanagement/app-management-api#update-version
        if (await this.checkSignedIn() === false) { return; }
        const inputSelection = await AppVersionDialogueProvider.selectWhatToUpdate();
        console.log(inputSelection);
        if ((!inputSelection) || (inputSelection.length === 0)) { return; }
        switch (inputSelection) {
            case "Availability":
                const newAvailability = await AppVersionDialogueProvider.selectAvailability();
                if ((!newAvailability) || (newAvailability.length === 0)) { return; }
                // TODO: Test this
                await this.apiProvider.updateAppVersion(version.appItem.id, version.appCountry.countryCode, version.appVersionItem.version, newAvailability);
                break;
            case "Set Dependency Compatibility":
                const result = await AppVersionDialogueProvider.appVersionCompatibilityDialogue(version, this.apiProvider);
                if (!result) { return; }
                if (!result[0] || !result[1]) { return; }
                // TODO: Test this
                await this.apiProvider.updateAppVersion(version.appItem.id, version.appCountry.countryCode, version.appVersionItem.version, undefined, result[0], result[1]);
                break;
            case "SyncMode":
                const newSyncMode = await AppVersionDialogueProvider.selectSyncMode();
                if ((!newSyncMode) || (newSyncMode.length === 0)) { return; }
                // TODO: Test this
                await this.apiProvider.updateAppVersion(version.appItem.id, version.appCountry.countryCode, version.appVersionItem.version, undefined, undefined, undefined, newSyncMode);
                break;
        }
        this.currTreeProvider.refresh();
    };
    public downloadAppVersionCommand = async (version: FameAppVersionTreeItem) => {
        if (await this.checkSignedIn() === false) { return; }
        const targetDirectory = await Utilities.selectFolderDialog('Select download folder');
        const filename = await this.apiProvider.downloadAppVersion(version.appVersionItem.appId, version.appVersionItem.countryCode, version.appVersionItem.version, targetDirectory, `${version.appItem.publisher}_${version.appItem.name}_${version.appVersionItem.version}`);
        vscode.window.showInformationMessage(`Downloaded to ${filename}`);
    };
    public inspectAppVersionNavxCommand = async (version: FameAppVersionTreeItem) => {
        if (await this.checkSignedIn() === false) { return; }
        const filename = await this.apiProvider.downloadAppVersion(version.appVersionItem.appId, version.appVersionItem.countryCode, version.appVersionItem.version, undefined, `${version.appItem.publisher}_${version.appItem.name}_${version.appVersionItem.version}-1`);

        const navx = await NavxHelper.async(filename);
        const options: Object = {
            content: navx.getAsXml(),
            language: 'xml'
        };
        vscode.workspace.openTextDocument(options).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    };
    public addAppPrincipalCommand = async (entityPrincipalItem: FameAppSubEntityPrincipalsTreeItem) => {
        // PATCH https://apps.businesscentral.dynamics.com/v1.0/apps/{appId}/principals/{id}    
        if (await this.checkSignedIn() === false) { return; }
        const inputSelection = await PrincipalSelectProvider.selectPrincipalDialog(this.apiProvider);
        console.log(inputSelection);
        if ((!inputSelection) || (inputSelection[0].length === 0) || (inputSelection[1].length === 0)) { return; }
        inputSelection[0].forEach(async (entry) => {
            await this.apiProvider.addAppPrincipal(entityPrincipalItem.appItem.id, entry, inputSelection[1]);
        });
        this.currTreeProvider.refresh();
    };
    public updateAppPrincipalCommand = async (entityPrincipalItem: FameAppPrincipalTreeItem) => {
        // PATCH https://apps.businesscentral.dynamics.com/v1.0/apps/{appId}/principals/{id}
        if (await this.checkSignedIn() === false) { return; }
        const inputSelection = await PrincipalSelectProvider.selectRoles();
        console.log(inputSelection);
        if ((!inputSelection) || (inputSelection.length === 0)) { return; }
        await this.apiProvider.updateAppPrincipal(entityPrincipalItem.appItem.id, { principalType: entityPrincipalItem.appPrincipal.type, principalId: entityPrincipalItem.appPrincipal.id }, inputSelection);
        this.currTreeProvider.refresh();
        vscode.window.showInformationMessage(`Updated principal "${entityPrincipalItem.getIdentifier()}"`);
    };
    public removeAppPrincipalCommand = async (principalItem: FameAppPrincipalTreeItem) => {
        // DELETE https://apps.businesscentral.dynamics.com/v1.0/apps/{appId}/principals/{id}
        if (await this.checkSignedIn() === false) { return; }
        vscode.window.showWarningMessage(`Are you sure that you want to remove principal "${principalItem.getIdentifier()}" from app "${principalItem.appItem.name}?"`, "Yes", "No").
            then(async (answer) => {
                if (answer === "Yes") {
                    await this.apiProvider.removeAppPrincipal(principalItem.appItem.id, principalItem.appPrincipal.id);
                    vscode.window.showInformationMessage(`Removed principal "${principalItem.getIdentifier()}" from app "${principalItem.appItem.name}"`);
                    this.currTreeProvider.refresh();
                }
            });
    };
    private async checkSignedIn() {
        if (await this.apiProvider.isSignedIn(ApiType.D365) === false) {
            vscode.window.showWarningMessage(`You need to be signed in for this.`);
            return false;
        }
        if (await this.apiProvider.isSignedIn(ApiType.Graph) === false) {
            vscode.window.showWarningMessage(`You need to be signed in for this.`);
            return false;
        }
        return true;
    }
    public validateManifestCommand = async () => {
        const currEditor = vscode.window.activeTextEditor;
        if (!currEditor) {
            vscode.window.showInformationMessage(`You need to open a manifest.json file first.`);
            return;
        }
        const content = currEditor.document.getText();
        if (!content) {
            vscode.window.showInformationMessage(`You need to open a manifest.json file first.`);
            return;
        }
        if (await this.checkSignedIn() === false) { return; }
        const countries = Utilities.getConfigurationValue(SETTINGS.countrySelection) as string[];
        if (!countries || countries.length === 0) {
            vscode.window.showInformationMessage(`You need to provide a list of possible countries in the setting ${SETTINGS.countrySelection}.`);
            return;
        }
        const countryCode = await vscode.window.showQuickPick(countries, {
            placeHolder: '...',
            title: 'Select country you want to validate the manifest against.'
        });
        if (!countryCode) { return; }
        const manifest = new ManifestHelper(content, this.apiProvider);
        const result = await manifest.validate(countryCode);
        if (result.hasProblems() === false) {
            vscode.window.showInformationMessage(`No problems found in currently opened manifest.`);
        } else {
            const options: Object = {
                content: result.getOutput()
            };
            vscode.workspace.openTextDocument(options).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        }
    };
    public scheduleEnvironmentHotfixFromEnvironmentCommand = async (environmentItem: FameAppEnvironmentTreeItem) => {
        const version = await EnvironmentHotfixDialogueProvider.selectAppVersionToSchedule(this.apiProvider, environmentItem, environmentItem.appCountry.countryCode);
        if (!version) { return; }
        const date = await EnvironmentHotfixDialogueProvider.selectDate();
        if (!date) { return; }
        if (date < new Date()) {
            vscode.window.showErrorMessage("Date needs to be in the future.");
            return;
        }
        // TODO: Validate that it's an allowed version
        await this.scheduleEnvironmentHotfix(version, environmentItem.appEnvironment, date);
    };
    public scheduleEnvironmentHotfixFromVersionCommand = async (version: FameAppVersionTreeItem) => {
        const environment = await EnvironmentHotfixDialogueProvider.selectAppEnvironmentToSchedule(this.apiProvider, version, version.appCountry.countryCode);
        if (!environment) { return; }
        const date = await EnvironmentHotfixDialogueProvider.selectDate();
        if (!date) { return; }
        if (date < new Date()) {
            vscode.window.showErrorMessage("Date needs to be in the future.");
            return;
        }
        // TODO: Validate that it's an allowed version
        await this.scheduleEnvironmentHotfix(version.appVersionItem, environment, date);
    };
    public scheduleEnvironmentHotfix = async (version: IFameAppVersion, environment: IFameAppEnvironment, date: Date) => {
        await vscode.window.showWarningMessage(`Are you sure that you want to schedule version "${version.version}" as hotfix for environment "${environment.name}" in Tenant "${environment.aadTenantId}" for ${date.toISOString()}?"`, "Yes", "No").
            then(async (answer) => {
                if (answer === "Yes") {
                    const body = EnvironmentHotfixDialogueProvider.constructBody(environment, version, date);
                    const result = await this.apiProvider.scheduleEnvironmentHotfixForApp(version.appId, environment.countryCode, body);
                    vscode.window.showInformationMessage(`Scheduled version "${version.version}" as hotfix for environment "${environment.name}" in Tenant "${environment.aadTenantId}" for ${date.toISOString()}`);
                    this.currTreeProvider.refresh();
                }
            });
    };
    public updateEnvironmentHotfixCommand = async (hotfixItem: FameAppEnvironmentHotfixTreeItem) => {
        if (await this.checkSignedIn() === false) { return; }
        const inputSelection = await EnvironmentHotfixDialogueProvider.selectUpdateOption();
        console.log(inputSelection);
        if ((!inputSelection) || (inputSelection.length === 0)) { return; }
        switch (inputSelection) {
            // Right now only cancelling is supported by the API; will extend when the API is being extended
            case "Cancel scheduled Hotfix":
                await vscode.window.showWarningMessage(`Are you sure that you want to cancel the scheduled hotfix?`, "Yes", "No").
                    then(async (answer) => {
                        if (answer === "Yes") {
                            const body = {
                                status: "Canceled"
                            };
                            await this.apiProvider.updateEnvironmentHotfixForApp(hotfixItem.appItem.id, hotfixItem.appCountry.countryCode, hotfixItem.appHotfix.id, body);
                            vscode.window.showInformationMessage(`Cancelled scheduled hotfix`);
                            this.currTreeProvider.refresh();
                        }
                    });
                break;
        }
    };
    public sortAppsByOriginalOrderCommand = async () => {
        this.currTreeProvider.sort(SortingType.byOriginalOrder);
    };
    public sortAppsByIdCommand = async () => {
        this.currTreeProvider.sort(SortingType.byId);
    };
    public sortAppsByNameCommand = async () => {
        this.currTreeProvider.sort(SortingType.byName);
    };
    public setTreeViewProvider = (provider: FameTreeProvider) => {
        this.currTreeProvider = provider;
    };
    public createDatabaseExportSasCommand = async () => {
        const sasUrl = await Utilities.generateDatabaseExportInformation();
        if (sasUrl === undefined) { return; }
        vscode.env.clipboard.writeText(sasUrl);
        vscode.window.showInformationMessage(`Added information to clipboard.`);
    };
    public selectAzureSubscriptionCommand = async () => {
        await AzureUtils.selectAzureSubscription();
    };
}