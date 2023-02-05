import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SETTINGS } from '../constants';
import { ungzip } from 'node-gzip';

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
    public static getFileBytesAsBase64(filename: string) {
        var text = fs.readFileSync(filename, 'base64');
        return text;
    };
    public static async saveAsTempFile(buf: Buffer, filename: string, withReplace: boolean, targetFolder?: string) {
        if (withReplace === true) {
            filename = filename.replace(".app", ".zip");
        }
        const tempFile = path.join(`${(targetFolder) ? targetFolder : os.tmpdir()}`, `${path.basename(filename)}`);
        fs.writeFileSync(tempFile, buf, { encoding: "binary" });
        return tempFile;
    };
    public static configurationExists(): Boolean {
        if (!vscode.workspace.getConfiguration(SETTINGS.key).get(SETTINGS.d365ApiClientId)) {
            vscode.window.showInformationMessage(`You need to setup configuration for ${SETTINGS.d365ApiClientId}`);
            return false;
        }
        if (!vscode.workspace.getConfiguration(SETTINGS.key).get(SETTINGS.d365ApiTenantId)) {
            vscode.window.showInformationMessage(`You need to setup configuration for ${SETTINGS.d365ApiTenantId}`);
            return false;
        }
        return true;
    };
    public static getConfigurationValue(identifier: string): string {
        if (!vscode.workspace.getConfiguration(SETTINGS.key).get(identifier)) {
            throw Error(`Setting ${identifier} in configuration ${SETTINGS.key} does not exist`);
        }
        return vscode.workspace.getConfiguration(SETTINGS.key).get(identifier) as string;
    };
}