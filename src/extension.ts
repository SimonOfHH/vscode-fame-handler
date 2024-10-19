import * as vscode from 'vscode';
import { COMMAND_NAME, EXTENSION_ID } from './constants/index';
import { DetailsViewProvider, FameTreeProvider, CommandProvider } from './providers/index';
import { FameAppCountrySubEntityVersionsTreeItem, FameAppEnvironmentHotfixTreeItem, FameAppEnvironmentTreeItem, FameAppPrincipalTreeItem, FameAppSubEntityPrincipalsTreeItem, FameAppTreeItem, FameAppVersionTreeItem } from './types/index';

let tokenInfoStatusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
	const cmdProvider = new CommandProvider(context);
	// Register Tree- and WebView-Provider
	await new FameTreeProvider(cmdProvider).register(context);
	await new DetailsViewProvider(context.extensionUri).register(context);

	// Register commands	
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.clearCacheCommand}`, () => cmdProvider.clearCacheProviderCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.signInCommand}`, () => cmdProvider.signInCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.exportAppMapCommand}`, () => cmdProvider.exportAppIdNameMapCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.importAppMapCommand}`, () => cmdProvider.importAppIdNameMapCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.loadAllAppInfoCommand}`, () => cmdProvider.loadAllAppsCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.assignAppToCountryCommand}`, (app: FameAppTreeItem) => cmdProvider.assignAppToCountryCommand(app)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.uploadAppVersionCommand}`, (version: FameAppCountrySubEntityVersionsTreeItem) => cmdProvider.uploadAppVersionCommand(version)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.uploadAppsFromDirectoryCommand}`, () => cmdProvider.uploadAppsFromDirectoryCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.updateVersionCommand}`, (version: FameAppVersionTreeItem) => cmdProvider.updateAppVersionCommand(version)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.downloadAppVersionCommand}`, (version: FameAppVersionTreeItem) => cmdProvider.downloadAppVersionCommand(version)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.inspectAppVersionNavxCommand}`, (version: FameAppVersionTreeItem) => cmdProvider.inspectAppVersionNavxCommand(version)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.addAppPrincipalCommand}`, (entityPrincipalItem: FameAppSubEntityPrincipalsTreeItem) => cmdProvider.addAppPrincipalCommand(entityPrincipalItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.updateAppPrincipalCommand}`, (entityPrincipalItem: FameAppPrincipalTreeItem) => cmdProvider.updateAppPrincipalCommand(entityPrincipalItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.removeAppPrincipalCommand}`, (entityPrincipalItem: FameAppPrincipalTreeItem) => cmdProvider.removeAppPrincipalCommand(entityPrincipalItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.validateManifestCommand}`, () => cmdProvider.validateManifestCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.scheduleEnvironmentHotfixFromEnvironmentCommand}`, (environmentItem : FameAppEnvironmentTreeItem) => cmdProvider.scheduleEnvironmentHotfixFromEnvironmentCommand(environmentItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.scheduleEnvironmentHotfixFromVersionCommand}`, (version: FameAppVersionTreeItem) => cmdProvider.scheduleEnvironmentHotfixFromVersionCommand(version)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.updateEnvironmentHotfixCommand}`, (environmentHotfixItem : FameAppEnvironmentHotfixTreeItem) => cmdProvider.updateEnvironmentHotfixCommand(environmentHotfixItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.statusBarUpdateCommand}`, () => cmdProvider.statusBarUpdateCommand(tokenInfoStatusBarItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.sortAppsByIdCommand}`, () => cmdProvider.sortAppsByIdCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.sortAppsByNameCommand}`, () => cmdProvider.sortAppsByNameCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.sortAppsByOriginalOrderCommand}`, () => cmdProvider.sortAppsByOriginalOrderCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.createDatabaseExportSasCommand}`, () => cmdProvider.createDatabaseExportSasCommand()));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.selectAzureSubscriptionCommand}`, () => cmdProvider.selectAzureSubscriptionCommand()));

	// Register Status Bar (updates every second)
	tokenInfoStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	tokenInfoStatusBarItem.command = COMMAND_NAME.statusBarUpdateCommand;
	context.subscriptions.push(tokenInfoStatusBarItem);
	cmdProvider.statusBarUpdateCommand(tokenInfoStatusBarItem);
	setInterval(async () => {
		await cmdProvider.statusBarUpdateCommand(tokenInfoStatusBarItem);
	}, 1000);
	// Ensure Azure Account extension is activated
    const azureAccountExtension = vscode.extensions.getExtension('ms-vscode.azure-account');
    if (azureAccountExtension) {
        azureAccountExtension.activate().then(() => {
            console.log('Azure Account extension activated ');
        });
    }
	console.log(`${EXTENSION_ID} active!`);
}

// This method is called when your extension is deactivated
export function deactivate() { }
