import * as vscode from 'vscode';
import { COMMAND_NAME, VIEWS } from '../constants';
import { CommandProvider } from '../providers';
import { FameAppCountrySubEntityEnvironmentsTreeItem, FameAppCountrySubEntityTreeItem, FameAppCountrySubEntityVersionsTreeItem, FameAppCountryTreeItem, FameAppEnvironmentHotfixTreeItem, FameAppEnvironmentSubEntityTreeItem, FameAppEnvironmentTenantTreeItem, FameAppEnvironmentTreeItem, FameAppPrincipalTreeItem, FameAppSubEntityCountriesTreeItem, FameAppSubEntityPrincipalsTreeItem, FameAppSubEntityTreeItem, FameAppTreeItem, FameAppVersionTreeItem, FameTreeItem, IFameApp, IFameAppCountry, IFameAppEnvironment, IFameAppEnvironmentHotifx } from '../types';
import { ApiType, Utilities } from '../utils';

export class FameTreeProvider {
    private _onDidChangeTreeData: vscode.EventEmitter<FameAppTreeItem | FameTreeItem | undefined | void> = new vscode.EventEmitter<FameAppTreeItem | FameTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FameAppTreeItem | FameTreeItem | undefined | void> = this._onDidChangeTreeData.event;
    private cmdProvider: CommandProvider;
    constructor(cmdProvider: CommandProvider) {
        this.cmdProvider = cmdProvider;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element: FameAppTreeItem): vscode.TreeItem {
        return element;
    }
    private async isConfigured(element?: vscode.TreeItem): Promise<boolean> {
        if (Utilities.configurationExists() === false) {
            return false;
        }
        if (this.cmdProvider.apiProvider) {
            if (await this.cmdProvider.apiProvider.isSignedIn(ApiType.D365) === false) {
                return false;
            }
            if (await this.cmdProvider.apiProvider.isSignedIn(ApiType.Graph) === false) {
                return false;
            }
        }
        if ((!element) && (!this.cmdProvider.apiProvider)) {
            return false;
        }
        return true;
    }
    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[] | undefined> {
        if (!this.isConfigured(element)) {
            return undefined;
        }
        // Current menu structure is like this:
        //  [0] [FameAppTreeItem]                            <App>..
        //  [1] [FameAppSubEntityCountriesTreeItem]            Countries
        //  [2] [FameAppCountryTreeItem]                         <Country>..
        //  [3] [FameAppVersionTreeItem]                           Versions
        //  [3] [FameAppCountrySubEntityEnvironmentsTreeItem]      Environments
        //  [5] [FameAppEnvironmentTenantTreeItem]                   <Tenant>
        //  [5] [FameAppEnvironmentTreeItem]                           <Environment>..
        //  [6] [FameAppEnvironmentSubEntityTreeItem]                    Hotfixes
        //  [7] [FameAppEnvironmentHotfixTreeItem]                         <Hotfix>..
        //  [1] [FameAppSubEntityPrincipalsTreeItem]         Principals
        //  [2] [FameAppPrincipalTreeItem]                     <Principal>..
        if (!element) {
            return await this.getApps();
        } else if (element instanceof FameAppTreeItem) {
            return await this.getAppsSubEntities(element);
        } else if (element instanceof FameAppSubEntityTreeItem) {
            if (element instanceof FameAppSubEntityCountriesTreeItem) {
                return await this.getCountriesForApp(element);
            } else if (element instanceof FameAppSubEntityPrincipalsTreeItem) {
                return await this.getPrincipalsForApp(element);
            }
        } else if (element instanceof FameAppCountrySubEntityTreeItem) {
            if (element instanceof FameAppCountrySubEntityVersionsTreeItem) {
                return await this.getVersionsForAppCountry(element);
            } else if (element instanceof FameAppCountrySubEntityEnvironmentsTreeItem) {
                return await this.getEnvironmentTenantsForAppCountry(element);
            }
        } else if (element instanceof FameAppEnvironmentTenantTreeItem) {
            return await this.getEnvironmentsForAppCountry(element);
        } else if (element instanceof FameAppCountryTreeItem) {
            return await this.getAppCountrySubEntities(element);
        } else if (element instanceof FameAppEnvironmentSubEntityTreeItem) {
            return await this.getEnvironmentHotfixesForAppCountry(element);
        } else if (element instanceof FameAppEnvironmentTreeItem) {
            return await this.getEnvironmentSubEntitiesForAppCountry(element);
        }
        return Promise.resolve([]);
    }
    async showDetailInformationForTreeItem(element?: vscode.TreeItem) {
        console.log(`Loading details for ${element?.label}`);
        if (element) {
            await vscode.commands.executeCommand(`${COMMAND_NAME.setDataCommand}`, await this.formatTreeItemDetails(element));
        }
    }
    private async formatTreeItemDetails(element: vscode.TreeItem): Promise<string[]> {
        if (element instanceof FameAppTreeItem) {
            return [JSON.stringify(element.appItem, null, "\t")];
        } else if (element instanceof FameAppCountryTreeItem) {
            return [JSON.stringify(element.appItem), JSON.stringify(element.appCountry)];
        } else if (element instanceof FameAppVersionTreeItem) {
            return [JSON.stringify(element.appItem), JSON.stringify(element.appCountry), JSON.stringify(element.appVersionItem)];
        } else if ((element instanceof FameAppEnvironmentTreeItem) || (element instanceof FameAppEnvironmentTenantTreeItem)) {
            return [JSON.stringify(element.appItem), JSON.stringify(element.appCountry), JSON.stringify(element.appEnvironment)];
        } else if (element instanceof FameAppPrincipalTreeItem) {
            return [JSON.stringify(element.appItem), JSON.stringify(element.appPrincipal)];
        } else if (element instanceof FameAppEnvironmentHotfixTreeItem) {
            return [JSON.stringify(element.appItem), JSON.stringify(element.appCountry), JSON.stringify(element.appEnvironment), JSON.stringify(element.appHotfix)];
        }
        return [element.label as string];
    }
    public async register(context: vscode.ExtensionContext): Promise<any> {
        // setup
        const options = {
            treeDataProvider: this,
            showCollapseAll: true
        };
        // build
        vscode.window.registerTreeDataProvider(`${VIEWS.appsView}`, this);
        vscode.commands.registerCommand(`${COMMAND_NAME.refreshEntryCommand}`, () => { this.refresh(); });
        // create
        const tree = vscode.window.createTreeView(`${VIEWS.appsView}`, options);

        // setup: events
        tree.onDidChangeSelection(e => { this.showDetailInformationForTreeItem(e.selection.at(0)); });
        tree.onDidCollapseElement(e => { });
        tree.onDidChangeVisibility(e => { });
        tree.onDidExpandElement(e => { });

        // subscribe
        context.subscriptions.push(tree);
        this.cmdProvider.setTreeViewProvider(this);
    }
    private async getApps(): Promise<FameAppTreeItem[]> {
        let apiResponse = await this.cmdProvider.apiProvider.getApps(false);
        let treeItems = new Array<FameAppTreeItem>;
        for (const [i, entry] of apiResponse.entries()) {
            treeItems.push(new FameAppTreeItem("App", vscode.TreeItemCollapsibleState.Collapsed, entry));
        }
        return treeItems;
    }
    private async getAppsSubEntities(element?: FameAppTreeItem): Promise<FameAppSubEntityTreeItem[]> {
        let treeItems = new Array<FameAppSubEntityTreeItem>;
        treeItems.push(new FameAppSubEntityCountriesTreeItem("Countries", vscode.TreeItemCollapsibleState.Collapsed, element?.appItem as IFameApp));
        treeItems.push(new FameAppSubEntityPrincipalsTreeItem("Principals", vscode.TreeItemCollapsibleState.Collapsed, element?.appItem as IFameApp));
        return treeItems;
    }
    private async getCountriesForApp(element?: FameAppSubEntityTreeItem): Promise<FameAppCountryTreeItem[]> {
        let apiResponse = await this.cmdProvider.apiProvider.getCountriesForApp(element?.appId as string);
        let treeItems = new Array<FameAppCountryTreeItem>;
        for (const [i, entry] of apiResponse.entries()) {
            treeItems.push(new FameAppCountryTreeItem(entry.countryCode, vscode.TreeItemCollapsibleState.Collapsed, element?.appItem as IFameApp, entry));
        }
        return treeItems;
    }
    private async getPrincipalsForApp(element?: FameAppSubEntityTreeItem): Promise<FameAppPrincipalTreeItem[]> {
        let apiResponse = await this.cmdProvider.apiProvider.getPrincipalsForApp(element?.appId as string);
        let treeItems = new Array<FameAppPrincipalTreeItem>;
        for (const [i, entry] of apiResponse.entries()) {
            treeItems.push(new FameAppPrincipalTreeItem(entry.id, vscode.TreeItemCollapsibleState.None, element?.appItem as IFameApp, entry, entry.roles));
        }
        return treeItems;
    }
    private async getAppCountrySubEntities(element?: FameAppCountryTreeItem): Promise<FameAppCountrySubEntityTreeItem[]> {
        let treeItems = new Array<FameAppCountrySubEntityTreeItem>;
        treeItems.push(new FameAppCountrySubEntityVersionsTreeItem("Versions", vscode.TreeItemCollapsibleState.Collapsed, element?.appItem as IFameApp, element?.appCountry as IFameAppCountry));
        treeItems.push(new FameAppCountrySubEntityEnvironmentsTreeItem("Environments", vscode.TreeItemCollapsibleState.Collapsed, element?.appItem as IFameApp, element?.appCountry as IFameAppCountry));
        return treeItems;
    }
    private async getVersionsForAppCountry(element?: FameAppCountrySubEntityTreeItem): Promise<FameAppVersionTreeItem[]> {
        let apiResponse = await this.cmdProvider.apiProvider.getVersionsForApp(element?.appId as string, element?.appCountry.countryCode as string, true);
        let treeItems = new Array<FameAppVersionTreeItem>;
        for (const [i, entry] of apiResponse.entries()) {
            treeItems.push(new FameAppVersionTreeItem("Version", vscode.TreeItemCollapsibleState.None, element?.appItem as IFameApp, entry, element?.appCountry as IFameAppCountry));
        }
        return treeItems;
    }
    private async getEnvironmentTenantsForAppCountry(element?: FameAppCountrySubEntityTreeItem): Promise<FameAppEnvironmentTenantTreeItem[]> {
        let apiResponse = await this.cmdProvider.apiProvider.getEnvironmentsForAppAsMap(element?.appId as string, element?.appCountry.countryCode as string, true);
        let treeItems = new Array<FameAppEnvironmentTenantTreeItem>;
        for (const [i, entry] of apiResponse.entries()) {
            treeItems.push(new FameAppEnvironmentTenantTreeItem(`Tenant: ${entry.aadTenantId}`, vscode.TreeItemCollapsibleState.Collapsed, element?.appItem as IFameApp, entry, element?.appCountry as IFameAppEnvironment));
        }
        return treeItems;
    }
    private async getEnvironmentsForAppCountry(element?: FameAppEnvironmentTenantTreeItem): Promise<FameAppEnvironmentTreeItem[]> {
        let apiResponse = await this.cmdProvider.apiProvider.getEnvironmentsForApp(element?.appId as string, element?.appCountry.countryCode as string, true, `aadTenantId eq ${element?.appEnvironment.aadTenantId}`);
        let treeItems = new Array<FameAppEnvironmentTreeItem>;
        for (const [i, entry] of apiResponse.entries()) {
            treeItems.push(new FameAppEnvironmentTreeItem(entry.name, vscode.TreeItemCollapsibleState.Collapsed, element?.appItem as IFameApp, entry, element?.appCountry as IFameAppCountry));
        }
        return treeItems;
    }
    private async getEnvironmentSubEntitiesForAppCountry(element?: FameAppEnvironmentTreeItem): Promise<FameAppEnvironmentSubEntityTreeItem[]> {
        let treeItems = new Array<FameAppEnvironmentSubEntityTreeItem>;
        treeItems.push(new FameAppEnvironmentSubEntityTreeItem("Hotfixes", vscode.TreeItemCollapsibleState.Collapsed, element?.appItem as IFameApp, element?.appEnvironment as IFameAppEnvironment, element?.appCountry as IFameAppCountry));
        return treeItems;
    }
    private async getEnvironmentHotfixesForAppCountry(element?: FameAppEnvironmentSubEntityTreeItem): Promise<FameAppEnvironmentHotfixTreeItem[]> {
        let apiResponse = await this.cmdProvider.apiProvider.getEnvironmentHotfixesForApp(element?.appId as string, element?.appCountry.countryCode as string, element?.appEnvironment.aadTenantId, element?.appEnvironment.name);
        let treeItems = new Array<FameAppEnvironmentHotfixTreeItem>;
        for (const [i, entry] of apiResponse.entries()) {
            treeItems.push(new FameAppEnvironmentHotfixTreeItem(entry.id, vscode.TreeItemCollapsibleState.None, element?.appItem as IFameApp, element?.appEnvironment as IFameAppEnvironment, element?.appCountry as IFameAppCountry, entry as IFameAppEnvironmentHotifx));
        }
        return treeItems;
    }
}