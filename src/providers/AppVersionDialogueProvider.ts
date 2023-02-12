import * as vscode from 'vscode';
import { ApiProvider } from '../providers';
import { FameAppVersionTreeItem, IFameAppDependency, IFameAppVersion } from '../types';

export class AppVersionDialogueProvider {
    public static selectWhatToUpdate = async (): Promise<string | undefined> => {
        const type = await vscode.window.showQuickPick(["Availability", "Set Dependency Compatibility"], {
            placeHolder: '...',
            title: 'What do you want to update?',
            canPickMany: false
        });
        if (!type) { return undefined; }
        return type;
    };
    public static selectAvailability = async (): Promise<string | undefined> => {
        const type = await vscode.window.showQuickPick(["Preview", "Available", "Deprecated"], {
            placeHolder: '...',
            title: 'Select Availability',
            canPickMany: false
        });
        if (!type) { return undefined; }
        return type;
    };
    public static appVersionCompatibilityDialogue = async (version: FameAppVersionTreeItem, apiProvider: ApiProvider): Promise<[string | undefined, string | undefined]> => {
        const selectedDependency = await AppVersionDialogueProvider.selectAppVersionDependency(version.appVersionItem);
        if (!selectedDependency) { return [undefined, undefined]; }
        const selectedVersion = await AppVersionDialogueProvider.selectAppVersionForCompatibility(apiProvider, selectedDependency, version.appVersionItem.countryCode);
        if (!selectedVersion) { return [undefined, undefined]; }
        let versionInput = selectedVersion.version;
        if (selectedVersion === manualFameAppVersionEntry) {
            versionInput = await AppVersionDialogueProvider.enterVersionManual() as string;
        }
        if (!versionInput) { return [undefined, undefined]; }
        const confirm = await AppVersionDialogueProvider.confirmUpdateAppVersionDependency(version, selectedDependency, versionInput);
        if (!confirm) { return [undefined, undefined]; }
        return [selectedDependency.appId, versionInput];
    };
    public static selectAppVersionDependency = async (appVersion: IFameAppVersion): Promise<IFameAppDependency | undefined> => {
        if (!appVersion.dependencies || appVersion.dependencies.length === 0) {
            vscode.window.showInformationMessage(`App ${appVersion.name} has no dependencies.`);
            return undefined;
        }
        const type = await vscode.window.showQuickPick(appVersion.dependencies.map(dep => { return new D365AppVersionDependencyItem(dep); }), {
            placeHolder: '...',
            title: 'Select dependency',
            canPickMany: false
        });
        if (!type) { return undefined; }
        return type.appVersionDependency;
    };
    public static enterVersionManual = async (): Promise<string | undefined> => {
        const placeholder = "1.0.0.0";
        const prompt = "Enter version to mark incompatible";
        const manualVersion = await vscode.window.showInputBox({
            placeHolder: placeholder,
            prompt: prompt,
            value: ""
        });
        if (!manualVersion) {
            return;
        }
        return manualVersion;
    };
    public static selectAppVersionForCompatibility = async (apiProvider: ApiProvider, appDependency: IFameAppDependency, countryCode: string): Promise<IFameAppVersion | undefined> => {
        return await new Promise<IFameAppVersion | undefined>(async (resolve, reject) => {
            const input = vscode.window.createQuickPick<D365AppVersionItem>();
            input.canSelectMany = false;
            input.placeholder = 'Type to search for version';
            let itemOptions: D365AppVersionItem[] = [];
            const apiValues = (await apiProvider.getVersionsForApp(appDependency.appId, countryCode, false)).map(entry => { return new D365AppVersionItem(entry); });
            itemOptions.push(new D365AppVersionItem(manualFameAppVersionEntry));
            itemOptions = itemOptions.concat(apiValues);
            input.items = itemOptions;
            input.onDidChangeValue(async (value) => {
                input.items = [];
                input.busy = true;
                let result = await apiProvider.getVersionsForApp(appDependency.appId, countryCode, false);
                if (value) {
                    result = result.filter(element => element.version.includes(value));
                }
                const apiValues = result.map(entry => { return new D365AppVersionItem(entry); });
                itemOptions.push(new D365AppVersionItem(manualFameAppVersionEntry));
                itemOptions = itemOptions.concat(apiValues);
                input.items = itemOptions;
                input.busy = false;
            });
            input.onDidAccept(() => {
                resolve(input.selectedItems[0].appVersion);
                input.hide();
            });
            input.onDidHide(() => {
                resolve(undefined);
                input.dispose();
            });
            input.show();
        });
    };
    public static confirmUpdateAppVersionDependency = async (version: FameAppVersionTreeItem, selectedDependency: IFameAppDependency, versionInput: string): Promise<boolean> => {
        const confirmMessage = `Dependency "${selectedDependency.name}" in version "${versionInput}" will be set to incompatible for app "${version.appItem.name}. Do you want to continue?`;
        let answerValue = false;
        await vscode.window.showWarningMessage(confirmMessage, "Yes", "No").
            then(async (answer) => {
                if (answer === "Yes") {
                    answerValue = true;
                }
            });
        return answerValue;
    };
}
export class D365AppVersionItem implements vscode.QuickPickItem {
    label: string;
    description = '';
    detail: string;
    appVersion: IFameAppVersion;

    constructor(appVersionItem: IFameAppVersion) {
        this.label = appVersionItem.version;
        this.detail = appVersionItem.name;
        this.appVersion = appVersionItem;
    }
};
class D365AppVersionDependencyItem implements vscode.QuickPickItem {
    label: string;
    description = '';
    detail: string;
    appVersionDependency: IFameAppDependency;

    constructor(appVersionDependencyItem: IFameAppDependency) {
        this.label = appVersionDependencyItem.name;
        this.detail = appVersionDependencyItem.appId;
        this.appVersionDependency = appVersionDependencyItem;
    }
};
const manualFameAppVersionEntry: IFameAppVersion = {
    version: "0.0.0.0",
    appId: "00000000-0000-0000-0000-000000000000",
    countryCode: "",
    packageId: "",
    publisher: "",
    name: "Enter manually",
    uploadedOn: "",
    availability: "",
    status: "",
    dependencies: [],
    majorVersion: 0,
    minorVersion: 0,
    buildVersion: 0,
    revisionVersion: 0
};