import * as vscode from 'vscode';
export class AppVersionDialogueProvider {
    public static selectWhatToUpdate = async (): Promise<string | undefined> => {
        const type = await vscode.window.showQuickPick(["Availability", "Set Dependency Compatibility"], {
            placeHolder: '...',
            title: 'What do you want to update?',
            canPickMany: false
        });
        if (!type) { return undefined; }
        return type;
    };
    public static selectAvailability = async (): Promise<string | undefined> => {
        const type = await vscode.window.showQuickPick(["Preview", "Available", "Deprecated"], {
            placeHolder: '...',
            title: 'Select Availability',
            canPickMany: false
        });
        if (!type) { return undefined; }
        return type;
    };
}