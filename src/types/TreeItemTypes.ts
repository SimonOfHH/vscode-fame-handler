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
        if (appItem.name) {
            this.label = appItem.name;
            if (showPlaceholder() === true) {
                this.label = "<App Name Placeholder>";
            }
        } else {
            this.label = appItem.id;
        }
        this.tooltip = appItem.storageLocation;
        this.description = appItem.publisher;
        if (showPlaceholder() === true) {
            this.description = "<Publisher Placeholder>";
        }
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
            if (showPlaceholder() === true) {
                this.label = "<Princiapl Placeholder>";
            }
        } else {
            this.label = `Enterprise Application: ${appPrincipal.id}`;
            if (showPlaceholder() === true) {
                this.label = `Enterprise Application: <Princiapl Placeholder>`;
            }
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