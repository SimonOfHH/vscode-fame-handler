import * as vscode from 'vscode';
import { COMMAND_NAME, EXTENSION_ID } from './constants';
import { DetailsViewProvider, FameTreeProvider, CommandProvider } from './providers';
import { FameAppCountrySubEntityVersionsTreeItem, FameAppPrincipalTreeItem, FameAppSubEntityPrincipalsTreeItem, FameAppVersionTreeItem } from './types';

let tokenInfoStatusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
	const cmdProvider = new CommandProvider(context);
	// Register Tree- and WebView-Provider
	await cmdProvider.setExtensionContextCommand(context);
	await new FameTreeProvider(cmdProvider).register(context);
	await new DetailsViewProvider(context.extensionUri).register(context);

	// Register commands	
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.clearCacheCommand}`, () => cmdProvider.clearCacheProviderCommand(context)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.signInCommand}`, () => cmdProvider.signInCommand(context)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.exportAppMapCommand}`, () => cmdProvider.exportAppIdNameMapCommand(context)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.importAppMapCommand}`, () => cmdProvider.importAppIdNameMapCommand(context)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.loadAllAppInfoCommand}`, () => cmdProvider.loadAllAppsCommand(context)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.uploadAppVersionCommand}`, (version: FameAppCountrySubEntityVersionsTreeItem) => cmdProvider.uploadAppVersionCommand(context, version)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.updateVersionCommand}`, (version: FameAppVersionTreeItem) => cmdProvider.updateAppVersionCommand(context, version)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.downloadAppVersionCommand}`, (version: FameAppVersionTreeItem) => cmdProvider.downloadAppVersionCommand(context, version)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.addAppPrincipalCommand}`, (entityPrincipalItem: FameAppSubEntityPrincipalsTreeItem) => cmdProvider.addAppPrincipalCommand(context, entityPrincipalItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.updateAppPrincipalCommand}`, (entityPrincipalItem: FameAppPrincipalTreeItem) => cmdProvider.updateAppPrincipalCommand(context, entityPrincipalItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.removeAppPrincipalCommand}`, (entityPrincipalItem: FameAppPrincipalTreeItem) => cmdProvider.removeAppPrincipalCommand(context, entityPrincipalItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.validateManifestCommand}`, () => cmdProvider.validateManifestCommand(context)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.statusBarUpdateCommand}`, () => cmdProvider.statusBarUpdateCommand(context, tokenInfoStatusBarItem)));
	context.subscriptions.push(vscode.commands.registerCommand(`${COMMAND_NAME.testUserCommand}`, () => cmdProvider.testUserCommand(context)));
	
	// Register Status Bar (updates every second)
	tokenInfoStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	tokenInfoStatusBarItem.command = COMMAND_NAME.statusBarUpdateCommand;
	context.subscriptions.push(tokenInfoStatusBarItem);
	cmdProvider.statusBarUpdateCommand(context, tokenInfoStatusBarItem);
	setInterval(async () => {
		await cmdProvider.statusBarUpdateCommand(context, tokenInfoStatusBarItem);
	}, 1000);
	
	console.log(`${EXTENSION_ID} active`);
}

// This method is called when your extension is deactivated
export function deactivate() { }
