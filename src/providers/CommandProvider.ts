import * as vscode from 'vscode';
import { CACHE_FAMEAPPS, CACHE_IDNAMEMAP, CACHE_NAME, SETTINGS } from '../constants';
import { ApiProvider, AppVersionDialogueProvider, CacheProvider, FameTreeProvider, PrincipalSelectProvider, ValueProvider } from '../providers';
import { FameAppTreeItem, FameAppVersionTreeItem, FameAppPrincipalTreeItem, FameAppSubEntityPrincipalsTreeItem, FameAppCountrySubEntityVersionsTreeItem } from '../types';
import { IFameApp } from '../types/FameTypes';
import { ApiType, ManifestHelper, NavxHelper, Utilities } from '../utils';

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
        tokenInfoStatusBarItem.text = await ValueProvider.getTokenLifetimeFromCache(this);
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
        ValueProvider.putMapIntoCache(map, CACHE_IDNAMEMAP, this);
    };
    public exportAppIdNameMapCommand = async () => {
        const cache: CacheProvider = CacheProvider.getInstance(this.currContext, "cache");
        let cachedApps = await cache.get("v1", CACHE_FAMEAPPS) as IFameApp[];
        let map = await ValueProvider.appsToIdNameMap(cachedApps, this);
        vscode.env.clipboard.writeText(JSON.stringify(Object.fromEntries(map)));
        vscode.window.showInformationMessage(`Copied to clipboard.`);
    };
    public uploadAppVersionCommand = async (version: FameAppCountrySubEntityVersionsTreeItem) => {
        if (await this.checkSignedIn() === false) { return; }
        const file = await Utilities.selectFileDialog();
        if (file) {
            const navx = await NavxHelper.async(file);
            if (navx.getAppValue("Id") !== version.appItem.id) {
                vscode.window.showErrorMessage(`ID from selected app file and selected version do not match. Currently selected is ${version.appItem.id}, but the file contains ${navx.getAppValue("Id")}`);
                return;
            }
            const base64content = Utilities.getFileBytesAsBase64(file);
            let response = await this.apiProvider.addNewAppVersion(version.appItem.id, version.appCountry.countryCode, "Available", base64content);
            vscode.window.showInformationMessage(`Successfully uploaded file: ${file}`);
        }
    };
    public loadAllAppsCommand = async () => {
        if (await this.checkSignedIn() === false) { return; }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
            title: 'Loading apps'
        }, async (progress) => {
            await this.apiProvider.collectInformationFromVersions();
        });
        this.currTreeProvider.refresh();
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
        return true;
    }
    public validateManifestCommand = async () => {
        const currEditor = vscode.window.activeTextEditor;
        if (!currEditor) { return; }
        const content = currEditor.document.getText();
        if (!content) { return; }
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
    public testUserCommand = async () => {
        // TODO: Implement
        // just for testing
        vscode.window.showInformationMessage(`TODO: Implement testUserCommand`);
    };
    public setTreeViewProvider = (provider: FameTreeProvider) => {
        this.currTreeProvider = provider;
    };
}