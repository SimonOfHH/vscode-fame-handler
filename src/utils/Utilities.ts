import * as fs from 'fs';
import { ungzip } from 'node-gzip';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { SETTINGS } from '../constants';

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
}