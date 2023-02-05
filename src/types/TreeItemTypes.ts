import * as vscode from 'vscode';
import { IFameApp, IFameAppCountry, IFameAppEnvironment, IFameAppPrincipal, IFameAppVersion } from '../types';

export class FameTreeItem extends vscode.TreeItem {
    public appId: string = "";
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly command?: vscode.Command,
    ) {
        super(label, collapsibleState);
        this.appId = appItem.id;
    }
}
export class FameAppTreeItem extends FameTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly command?: vscode.Command,
    ) {
        super(label, collapsibleState, appItem);
        if (appItem.name) {
            this.label = appItem.name;
        } else {
            this.label = appItem.id;
        }
        this.tooltip = appItem.storageLocation;
        this.description = appItem.publisher;
    }
    iconPath = new vscode.ThemeIcon('package');
    contextValue = 'fameapp';
}
export class FameAppSubEntityTreeItem extends FameTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) {
        super(label, collapsibleState, appItem);
    }
    contextValue = 'subentity';
}
export class FameAppSubEntityCountriesTreeItem extends FameAppSubEntityTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) {
        super(label, collapsibleState, appItem);
    }
    iconPath = new vscode.ThemeIcon('globe');
    contextValue = 'subentityCountry';
}
export class FameAppSubEntityPrincipalsTreeItem extends FameAppSubEntityTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) { super(label, collapsibleState, appItem); }
    iconPath = new vscode.ThemeIcon('organization');
    contextValue = 'subentityPrincipal';
}
export class FameAppSubEntityEnvironmentTreeItem extends FameAppSubEntityTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) { super(label, collapsibleState, appItem); }
    iconPath = new vscode.ThemeIcon('list-tree');
    contextValue = 'subentityEnvironment';
}
export class FameAppCountryTreeItem extends FameTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly appCountry: IFameAppCountry,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) { super(label, collapsibleState, appItem); }
    contextValue = 'country';
}
export class FameAppCountrySubEntityTreeItem extends FameAppCountryTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly appCountry: IFameAppCountry,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) { super(label, collapsibleState, appItem, appCountry); }
    contextValue = 'countrySubEntity';
}
export class FameAppCountrySubEntityVersionsTreeItem extends FameAppCountrySubEntityTreeItem {
    iconPath = new vscode.ThemeIcon('versions');
    contextValue = 'countrySubEntityVersions';
}
export class FameAppCountrySubEntityEnvironmentsTreeItem extends FameAppCountrySubEntityTreeItem {
    iconPath = new vscode.ThemeIcon('library');
    contextValue = 'countrySubEntityEnvironments';
}
export class FameAppPrincipalTreeItem extends FameTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly appPrincipal: IFameAppPrincipal,
        public readonly roles?: string[],
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) {
        super(label, collapsibleState, appItem);
        if (appPrincipal.name) {
            this.label = appPrincipal.name;
        } else {
            this.label = `Enterprise Application: ${appPrincipal.id}`;
        }
        if (roles) {
            this.description = `Roles: ${roles.join(", ")}`;
        }
    }
    iconPath = new vscode.ThemeIcon('account');
    contextValue = 'principal';
}
export class FameAppVersionTreeItem extends FameTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly appVersionItem: IFameAppVersion,
        public readonly appCountry: IFameAppCountry,
        public readonly countryCode?: string,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) {
        super(label, collapsibleState, appItem);
        this.label = this.formatVersionNumber(appVersionItem);
    }
    iconPath = new vscode.ThemeIcon('symbol-field');
    contextValue = 'countryVersion';

    private formatVersionNumber(appVersion: IFameAppVersion) {
        return `${appVersion.majorVersion}.${appVersion.minorVersion}.${appVersion.buildVersion}.${appVersion.revisionVersion}`;
    }
}
export class FameAppEnvironmentTenantTreeItem extends FameTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly appEnvironment: IFameAppEnvironment,
        public readonly appCountry: IFameAppCountry,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) {
        super(label, collapsibleState, appItem);
    }
    iconPath = new vscode.ThemeIcon('cloud');
    contextValue = 'environmentTenant';
}
export class FameAppEnvironmentTreeItem extends FameTreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly appItem: IFameApp,
        public readonly appEnvironment: IFameAppEnvironment,
        public readonly appCountry: IFameAppCountry,
        public readonly countryCode?: string,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        public readonly description?: string
    ) {
        super(label, collapsibleState, appItem);
        //this.label = this.formatVersionNumber(appVersionItem);
        this.description = appEnvironment.aadTenantId;
    }
    iconPath = new vscode.ThemeIcon('database');
    contextValue = 'environment';

    private formatVersionNumber(appVersion: IFameAppVersion) {
        return `${appVersion.majorVersion}.${appVersion.minorVersion}.${appVersion.buildVersion}.${appVersion.revisionVersion}`;
    }
}