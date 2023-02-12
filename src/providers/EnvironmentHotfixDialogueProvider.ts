import * as vscode from 'vscode';
import { FameAppEnvironmentTreeItem, FameAppVersionTreeItem, IFameAppEnvironment, IFameAppVersion } from '../types';
import { ApiProvider } from './ApiProvider';
import { D365AppVersionItem } from './AppVersionDialogueProvider';

export class EnvironmentHotfixDialogueProvider {
    public static selectUpdateOption = async (): Promise<string | undefined> => {
        // Right now only cancelling is supported by the API; will extend when the API is being extended
        const type = await vscode.window.showQuickPick(["Cancel scheduled Hotfix"], {
            placeHolder: '...',
            title: 'What do you want to do?',
            canPickMany: false
        });
        if (!type) { return undefined; }
        return type;
    };
    public static selectAppVersionToSchedule = async (apiProvider: ApiProvider, environmentItem: FameAppEnvironmentTreeItem, countryCode: string): Promise<IFameAppVersion | undefined> => {
        return await new Promise<IFameAppVersion | undefined>(async (resolve, reject) => {
            const input = vscode.window.createQuickPick<D365AppVersionItem>();
            input.canSelectMany = false;
            input.placeholder = 'Type to search for version';
            //const apiValues = (await apiProvider.getVersionsForApp(environmentItem.appItem.id, countryCode, false)).map(entry => { return new D365AppVersionItem(entry); });
            input.items = (await apiProvider.getVersionsForApp(environmentItem.appItem.id, countryCode, false)).map(entry => { return new D365AppVersionItem(entry); });
            input.onDidChangeValue(async (value) => {
                input.items = [];
                input.busy = true;
                input.items = (await apiProvider.getVersionsForApp(environmentItem.appItem.id, countryCode, false)).filter(element => element.version.includes(value)).map(entry => { return new D365AppVersionItem(entry); });
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
    public static selectAppEnvironmentToSchedule = async (apiProvider: ApiProvider, version: FameAppVersionTreeItem, countryCode: string): Promise<IFameAppEnvironment | undefined> => {
        return await new Promise<IFameAppEnvironment | undefined>(async (resolve, reject) => {
            const input = vscode.window.createQuickPick<D365AppEnvironmentItem>();
            input.canSelectMany = false;
            input.placeholder = 'Type to search for environment';
            input.items = (await apiProvider.getEnvironmentsForApp(version.appItem.id, countryCode, false)).map(entry => { return new D365AppEnvironmentItem(entry); });
            input.onDidChangeValue(async (value) => {
                input.items = [];
                input.busy = true;
                input.items = (await apiProvider.getEnvironmentsForApp(version.appItem.id, countryCode, false)).filter(element => element.version.includes(value)).map(entry => { return new D365AppEnvironmentItem(entry); });
                input.busy = false;
            });
            input.onDidAccept(() => {
                resolve(input.selectedItems[0].appEnvironment);
                input.hide();
            });
            input.onDidHide(() => {
                resolve(undefined);
                input.dispose();
            });
            input.show();
        });
    };
    public static selectDate = async (): Promise<Date | undefined> => {
        const today = new Date();
        const defaultValue = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0)).toISOString();
        const returnValue = await vscode.window.showInputBox({
            placeHolder: defaultValue,
            prompt: "Enter earliest Date to schedule the hotfix",
            value: defaultValue,
            validateInput: inputValue => {
                if (this.isValidDate(inputValue)) { return null; }
                return "Not a valid date";
            }
        });
        if (!returnValue) { return undefined; }
        return new Date(returnValue);
    };
    private static isValidDate(input: string): Boolean {
        let validDate = undefined;
        try {
            const validation = Date.parse(input);
            if ((validation) && (validation !== 0)) {
                validDate = new Date(validation);
            }
        } catch { }
        if (validDate) { return true; }
        return false;
    }
    public static constructBody = (environment: IFameAppEnvironment, version: IFameAppVersion, runAfter: Date) => {        
        const body = {
            environmentAadTenantId: environment.aadTenantId,
            targetAppVersion: version.version,
            runAfter: runAfter, // TODO: Check format
            environmentApplicationFamily: environment.applicationFamily,
            environmentName: environment.name,
            environmentType: environment.type
        };
        return body;
    };
}
class D365AppEnvironmentItem implements vscode.QuickPickItem {
    label: string;
    description = '';
    detail: string;
    appEnvironment: IFameAppEnvironment;

    constructor(appEnvironmentItem: IFameAppEnvironment) {
        this.label = appEnvironmentItem.name;
        this.detail = `${appEnvironmentItem.type} (${appEnvironmentItem.aadTenantId})`;
        this.appEnvironment = appEnvironmentItem;
    }
};