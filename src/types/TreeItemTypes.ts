import * as vscode from 'vscode';
import { IFameApp, IFameAppCountry, IFameAppEnvironment, IFameAppPrincipal, IFameAppVersion } from '../types';
import { Utilities } from '../utils';

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
        this.label = this.getIdentifier();
        this.tooltip = appItem.storageLocation;
        this.description = appItem.publisher;
        if (showPlaceholder() === true) {
            this.description = "<Publisher Placeholder>";
        }
    }
    iconPath = new vscode.ThemeIcon('package');
    contextValue = 'fameapp';
    public getIdentifier() {
        if (showPlaceholder() === true) {
            return "<App Name Placeholder>";
        }
        if (this.appItem.name) { return this.appItem.name; }
        return this.appItem.id;
    }
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
        this.label = this.getIdentifier();
        if (roles) {
            this.description = `Roles: ${roles.join(", ")}`;
        }
    }
    iconPath = new vscode.ThemeIcon('account');
    contextValue = 'principal';
    public getIdentifier() {
        if (showPlaceholder() === true) {
            return "<Principal Placeholder>";
        }
        if (this.appPrincipal.name) { return this.appPrincipal.name; }
        return this.appPrincipal.id;
    }
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
        this.description = appVersionItem.availability;
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
        if (showPlaceholder() === true) {
            this.label = "Tenant: <TenantId Placeholder>";
        }
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
        this.description = appEnvironment.aadTenantId;
        if (showPlaceholder() === true) {
            this.description = "<TenantId Placeholder>";
        }
    }
    iconPath = new vscode.ThemeIcon('database');
    contextValue = 'environment';
}
// Used for public screenshots, to avoid publishing information not meant to be published
export const showPlaceholder = () => {
    return Utilities.getConfigurationValue("showPlaceholder") as boolean;
};