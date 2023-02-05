import * as vscode from 'vscode';
import { ApiProvider, ValueProvider } from '../providers';
import { IGraphUser, IPrincipal, IPrincipalSet } from '../types';

export class PrincipalSelectProvider {
    public static async selectPrincipalDialog(apiProvider: ApiProvider): Promise<[IPrincipal[], string[]]> {
        const selection = await this.selectPrincipalSource();
        let index = -1;
        if (selection) {
            index = this.selectPrincipalOptions.indexOf(selection);
        }
        if (index === -1) { { return [[], []]; } }
        let inputSelection = undefined;
        switch (index) {
            case 0: {
                inputSelection = await this.selectFromConfigurationSets();
                break;
            };
            case 1: {
                inputSelection = await this.selectFromGraphApiUserLookup(apiProvider);
                break;
            };
            case 2: {
                inputSelection = await this.selectFromManualInput();
                break;
            }
        }
        if ((!inputSelection) || (inputSelection.length === 0)) { return [[], []]; }
        const roles = await this.selectRoles();
        if ((!roles) || (roles.length === 0)) { return [[], []]; }
        return [inputSelection, roles];
    }
    private static selectPrincipalOptions = ['Select from configuration sets', 'Select from AAD', 'Enter ID'];
    private static selectPrincipalSource = async () => {
        const result = await vscode.window.showQuickPick(this.selectPrincipalOptions, {
            placeHolder: '...',
        });
        return result;
    };
    private static selectFromConfigurationSets = async (): Promise<IPrincipal[]> => {
        const defaultPrincipalSets = ValueProvider.getDefaultPrincipalsFromConfiguration();
        if (!defaultPrincipalSets) { return []; }
        const items = defaultPrincipalSets.map(entry => { return new ConfigurationSetItem(entry); });
        const result = await vscode.window.showQuickPick<ConfigurationSetItem>(items, {
            placeHolder: '...',
        });
        if (!result) { return []; }
        return result.principalSet.values;
    };
    private static selectFromGraphApiUserLookup = async (apiProvider: ApiProvider) => {
        return await new Promise<IPrincipal[]>(async (resolve, reject) => {
            const input = vscode.window.createQuickPick<GraphUserItem>();
            input.canSelectMany = true;
            input.placeholder = 'Type to search for users';
            input.items = (await apiProvider.getUsers()).map(entry => { return new GraphUserItem(entry); });
            input.onDidChangeValue(async (value) => {
                input.items = [];
                input.busy = true;
                const result = await apiProvider.getUsers(value);
                input.items = input.items.concat(result.map(entry => { return new GraphUserItem(entry); }));
                input.busy = false;
            });
            input.onDidAccept(() => {
                resolve(input.selectedItems.map(entry => { return { principalType: "user", principalId: entry.graphUserItem.id }; }));
                input.hide();
            });
            input.onDidHide(() => {
                resolve([]);
                input.dispose();
            });
            input.show();
        });
    };
    private static selectFromManualInput = async (): Promise<IPrincipal[] | undefined> => {
        const result = await vscode.window.showInputBox({ placeHolder: "Enter principal ID...", title: "Principal ID", value: "00000000-0000-0000-0000-000000000000" });
        if (!result) { return undefined; }
        const type = await vscode.window.showQuickPick(["User", "Application"], {
            placeHolder: '...',
            title: 'Specify Type'
        });
        if (!type) { return undefined; }
        return [{ principalType: type, principalId: result }];
    };
    private static selectRoles = async (): Promise<string[] | undefined> => {
        const type = await vscode.window.showQuickPick(["Reader", "Contributor", "Owner"], {
            placeHolder: '...',
            title: 'Select Role(s)',
            canPickMany: true
        });
        if (!type) { return undefined; }
        return type;
    };
}

class ConfigurationSetItem implements vscode.QuickPickItem {
    label: string;
    description = '';
    detail: string;
    principalSet: IPrincipalSet;

    constructor(principalSet: IPrincipalSet) {
        this.label = principalSet.countryCode;
        this.detail = principalSet.values.map(entry => { return entry.principalId; }).join(", ");
        this.principalSet = principalSet;
    }
}
class GraphUserItem implements vscode.QuickPickItem {
    label: string;
    description = '';
    detail: string;
    graphUserItem: IGraphUser;

    constructor(graphUserItem: IGraphUser) {
        this.label = graphUserItem.displayName;
        this.detail = graphUserItem.id;
        this.graphUserItem = graphUserItem;
    }
};