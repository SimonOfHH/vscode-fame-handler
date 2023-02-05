import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SETTINGS } from '../constants';

export const selectFolderDialog = async (title?:string): Promise<string> => {
    const selection = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: `${(title) ? title : 'Select folder'}`,
        canSelectFiles: false,
        canSelectFolders: true
    });
    if (!selection || selection.length < 1) { return ""; }
    return selection[0].fsPath;
};
export const selectFileDialog = async (): Promise<string> => {
    const selection = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Select',
        canSelectFiles: true,
        canSelectFolders: false
    });
    if (!selection || selection.length < 1) { return ""; }
    return selection[0].fsPath;
};
export const getFileBytesAsBase64 = (filename: string) => {
    var text = fs.readFileSync(filename, 'base64');
    return text;
};
export const saveAsTempFile = async (buf: Buffer, filename: string, withReplace: boolean, targetFolder? : string) => {
    if (withReplace === true) {
        filename = filename.replace(".app", ".zip");
    }
    const tempFile = path.join(`${(targetFolder) ? targetFolder : os.tmpdir()}`, `${path.basename(filename)}`);
    fs.writeFileSync(tempFile, buf, { encoding: "binary" });
    return tempFile;
};
export const configurationExists = (): Boolean => {
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
export const getConfigurationValue = (identifier: string): string => {
    if (!vscode.workspace.getConfiguration(SETTINGS.key).get(identifier)) {
        throw Error(`Setting ${identifier} in configuration ${SETTINGS.key} does not exist`);
    }
    return vscode.workspace.getConfiguration(SETTINGS.key).get(identifier) as string;
};