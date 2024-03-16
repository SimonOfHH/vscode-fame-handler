import { GenericResourceExpanded } from "@azure/arm-resources";
import { ListContainerItem } from "@azure/arm-storage";
import * as fs from 'fs';
import { ungzip } from 'node-gzip';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { SETTINGS } from '../constants/index';
import { AzureUtils } from './AzureUtils';
import { NavxHelper } from "./NavxHelper";
import { ApiProvider } from "../providers/index";

export class Utilities {
    public static async unzipJsonFile(filePath: string) {
        const fullPath = path.join(__dirname, filePath);
        if (fs.existsSync(fullPath)) {
            const file = fs.readFileSync(fullPath);
            if (file) {
                const contents = await ungzip(file);
                if (contents) {
                    return JSON.parse(contents.toString());
                }
            }
        }
        return null;
    };
    public static async selectFolderDialog(title?: string): Promise<string> {
        const selection = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: `${(title) ? title : 'Select folder'}`,
            canSelectFiles: false,
            canSelectFolders: true
        });
        if (!selection || selection.length < 1) { return ""; }
        return selection[0].fsPath;
    };
    public static async selectFileDialog(title?: string): Promise<string> {
        const selection = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: `${(title) ? title : 'Select file'}`,
            canSelectFiles: true,
            canSelectFolders: false
        });
        if (!selection || selection.length < 1) { return ""; }
        return selection[0].fsPath;
    };
    public static async getFilesForDirectory(path: string): Promise<string[]> {
        const files = fs.readdirSync(path, { withFileTypes: true });
        const fileNames = files.map(file => `${path}/${file.name}`);
        return fileNames;
    }
    public static async getAppMaps(files : string[]): Promise<[Map<string, NavxHelper>,Map<string, NavxHelper>]> {
        let appsInfos = new Map<string, NavxHelper>();
        let idInfos = new Map<string, NavxHelper>();
        for (const filename of files.filter(file => file.endsWith(".app"))) {
            const content = await NavxHelper.async(filename);
            appsInfos.set(filename, content);
            idInfos.set(content.getAppValue("Id"), content);
        }
        return [appsInfos, idInfos];
    }
    public static sortMapByNumberOfEntriesInArrayNavX(apps: Map<string, NavxHelper>): Map<string, NavxHelper> {
        const sortedMap = new Map([...apps.entries()].sort((a, b) => {
            if (a[1].dependencies.length === 0 && b[1].dependencies.length === 0) {
                return 0;
            } else if (a[1].dependencies.length === 0) {
                return -1;
            } else if (b[1].dependencies.length === 0) {
                return 1;
            } else {
                return a[1].dependencies.length - b[1].dependencies.length;
            }
        }));
        return sortedMap;
    }
    public static sortMapByDependencies(appsInfos: Map<string, NavxHelper>, idInfos: Map<string, NavxHelper>): Map<string, NavxHelper>{
        let sorted = false;
        const appsSorted = new Map<string, NavxHelper>();
        const appsAdded = new Map<string, NavxHelper>();
        while (!sorted) {
            for (const [key, value] of appsInfos) {
                let dependencies = value.getDependencies();
                if (dependencies[0] === "") { dependencies = []; }
                if (appsSorted.has(key)) { continue; }
                if (dependencies.length === 0) {
                    appsSorted.set(key, value);
                    appsAdded.set(value.getAppValue("Id"), value);
                    continue;
                }
                let allDependenciesPresent = true;
                for (const [num, dep] of dependencies.entries()) {
                    console.log(dep);
                    const id = dep["@_Id"];
                    if (!appsAdded.has(id)) {
                        if (idInfos.has(id)) { // Ignore dependencies that are not fulfilled with the files in the current directory
                            allDependenciesPresent = false;
                            continue;
                        }
                    }
                }
                if (allDependenciesPresent === true) {
                    appsSorted.set(key, value);
                    appsAdded.set(value.getAppValue("Id"), value);
                }
            }
            if (appsSorted.size === appsInfos.size) {
                sorted = true;
            }
        }
        return appsSorted;
    }
    public static async validatePreconditionnsBeforeUpload(apps : Map<string, NavxHelper>, countryCode : string, apiProvider: ApiProvider) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
            title: `Validating pre-conditions (Country: ${countryCode})`
        }, async (progress) => {
            for (const [entry, content] of apps) {
                const appId = content.getAppValue("Id");
                const appName = content.getAppValue("Name");
                progress.report({ message: appName });
                const result = await apiProvider.getVersionsForApp(appId, countryCode, false);
                if (!result) {
                    vscode.window.showErrorMessage(`App ${appId}, does not exist for country ${countryCode} or there are no existing versions (${appName})`);
                    return;
                }
            }
        });
    }
    public static getFileBytesAsBase64(filename: string) {
        var text = fs.readFileSync(filename, 'base64');
        return text;
    };
    public static async saveAsTempFileFromStream(sourceStream: any, filename: string, withReplace: boolean, targetFolder?: string) {
        if (withReplace === true) {
            filename = filename.replace(".app", ".zip");
        }
        const tempFile = path.join(`${(targetFolder) ? targetFolder : os.tmpdir()}`, `${path.basename(filename)}`);
        if (fs.existsSync(tempFile)) {
            fs.rmSync(tempFile);
        }
        const writer = fs.createWriteStream(tempFile);
        await new Promise((resolve, reject) => {
            sourceStream.pipe(writer);
            let error: Error = new Error;
            writer.on('error', err => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on('close', () => {
                if (!error.message) {
                    resolve(true);
                }
                //no need to call the reject here, as it will have been called in the
                //'error' stream;
            });
        });
        return tempFile;
    }
    public static async saveAsTempFile(buf: Buffer, filename: string, withReplace: boolean, targetFolder?: string) {
        if (withReplace === true) {
            filename = filename.replace(".app", ".zip");
        }
        const tempFile = path.join(`${(targetFolder) ? targetFolder : os.tmpdir()}`, `${path.basename(filename)}`);
        fs.writeFileSync(tempFile, buf, { encoding: "binary" });
        return tempFile;
    };
    public static configurationExists(): Boolean {
        if (!this.getConfigurationValue(SETTINGS.d365ApiClientId)) {
            vscode.window.showInformationMessage(`You need to setup configuration for ${SETTINGS.d365ApiClientId}`);
            return false;
        }
        if (!this.getConfigurationValue(SETTINGS.d365ApiTenantId)) {
            vscode.window.showInformationMessage(`You need to setup configuration for ${SETTINGS.d365ApiTenantId}`);
            return false;
        }
        return true;
    };
    public static getConfigurationValue(identifier: string): any {
        if (!vscode.workspace.getConfiguration(SETTINGS.key).has(identifier)) {
            throw Error(`Setting ${identifier} in configuration ${SETTINGS.key} does not exist`);
        }
        return vscode.workspace.getConfiguration(SETTINGS.key).get(identifier);
    };
    public static async selectStorageAccount(): Promise<GenericResourceExpanded | undefined> {
        const storageAccounts = await AzureUtils.getStorageAccounts();
        if (!storageAccounts) { return; }
        const items: string[] = [];
        if (storageAccounts.length === 0) {
            items.push('No Storage Accounts found.');
        } else {
            storageAccounts.forEach((value) => {
                items.push(value.name as string);
            });
        }
        const accountPick = await vscode.window.showQuickPick(items, {
            placeHolder: '...',
            title: 'Select Storage Account',
            canPickMany: false
        });
        if (!accountPick) { return undefined; }
        if (storageAccounts.length === 0) { return undefined; }
        console.log(`Selected option: ${accountPick}`);
        const account = storageAccounts.filter((value) => value.name === accountPick)[0];
        return account;
    }
    public static async selectStorageAccountContainer(account: GenericResourceExpanded): Promise<ListContainerItem | undefined> {
        const storageAccountContainers = await AzureUtils.getStorageAccountContainers(account);
        if (!storageAccountContainers) { return; }
        const items: string[] = [];
        if (storageAccountContainers.length === 0) {
            items.push('No Storage Account container found.');
        } else {
            storageAccountContainers.forEach((value) => {
                items.push(value.name as string);
            });
        }
        const containerPick = await vscode.window.showQuickPick(items, {
            placeHolder: '...',
            title: 'Select Storage Account container',
            canPickMany: false
        });
        if (!containerPick) { return undefined; }
        if (storageAccountContainers.length === 0) { return undefined; }
        console.log(`Selected option: ${containerPick}`);
        const container = storageAccountContainers.filter((value) => value.name === containerPick)[0];
        return container;
    }
    public static async generateDatabaseExportInformation(): Promise<string | undefined> {
        const storageAccount = await Utilities.selectStorageAccount();
        if (storageAccount === undefined) { return undefined; }
        const storageAccountContainer = await Utilities.selectStorageAccountContainer(storageAccount as GenericResourceExpanded);
        if (storageAccountContainer === undefined) { return undefined; }
        const expiresOn = await this.selectExpiresOn();
        if (expiresOn === undefined) { return undefined; }
        const storageAccountKey = await AzureUtils.getStorageAccountAccessKey(storageAccount);
        if (storageAccountKey === undefined) { return undefined; }
        const url = await AzureUtils.generateStorageSasUrl(storageAccount.name as string, storageAccountKey.value as string, expiresOn);
        const info = `Container: ${storageAccountContainer?.name} \nURL: ${url}`;
        return info;
    }
    private static async selectExpiresOn() {
        const expirationPick = await vscode.window.showQuickPick(["1 hour", "2 hours", "4 hours", "1 day", "2 days", "3 days", "1 week"], {
            placeHolder: '...',
            title: 'Select expiration period',
            canPickMany: false
        });
        switch (expirationPick) {
            case "1 hour": return new Date(Date.now() + (60 * 60 * 1000));
            case "2 hours": return new Date(Date.now() + (120 * 60 * 1000));
            case "4 hours": return new Date(Date.now() + (240 * 60 * 1000));
            case "1 day": return new Date(Date.now() + (24 * 60 * 60 * 1000));
            case "2 days": return new Date(Date.now() + (2 * 24 * 60 * 60 * 1000));
            case "3 days": return new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
            case "1 week": return new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
            default: return undefined;
        }
    }
}