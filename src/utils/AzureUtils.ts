import * as vscode from 'vscode';
import { ValueProvider } from '../providers';
import { GenericResourceExpanded, ResourceManagementClient } from "@azure/arm-resources";
import { ListContainerItem, StorageManagementClient } from "@azure/arm-storage";
import { TokenCredential, VisualStudioCodeCredential, useIdentityPlugin } from "@azure/identity";
import { vsCodePlugin } from "@azure/identity-vscode";
import { SubscriptionClient,Subscription } from "@azure/arm-subscriptions";
import { AccountSASPermissions, AccountSASResourceTypes, AccountSASServices, SASProtocol, StorageSharedKeyCredential, generateAccountSASQueryParameters } from '@azure/storage-blob';
import { SETTINGS } from '../constants';

export class AzureUtils {
    private static getCredentials(): TokenCredential {
        console.log(`Initializing Azure credentials`);
        useIdentityPlugin(vsCodePlugin);
        return new VisualStudioCodeCredential(); // TODO: Check if this is the right way
    }
    public static async selectAzureSubscription() {
        const subscriptionClient = new SubscriptionClient(this.getCredentials());
        const subscriptionsResponse = subscriptionClient.subscriptions.list();
        const subs:Subscription[] = [];
        for await (const subscription of subscriptionsResponse) {
            subs.push(subscription);
        }
        const type = await vscode.window.showQuickPick(subs.map(sub => { return new SubscriptionItem(sub); }), {
            placeHolder: '...',
            title: 'Select subscription',
            canPickMany: false
        });
        if (!type) { return undefined; }
        const config = vscode.workspace.getConfiguration(SETTINGS.key);
        config.update(SETTINGS.azureSubscriptionId, type.subscription.subscriptionId, vscode.ConfigurationTarget.Global);
    }
    private static getSubscription(): string | undefined {
        console.log(`Reading Azure subscription id`);
        const id = ValueProvider.getAzureSubscriptionId();
        if (!id) {
            vscode.window.showErrorMessage(`Azure SubscriptionId needs to be set in configuration ("famehandler.azureSubscriptionId")`);
            return;
        }
        if (id === "00000000-0000-0000-0000-000000000000") {
            vscode.window.showErrorMessage(`Azure SubscriptionId needs to be set in configuration ("famehandler.azureSubscriptionId")`);
            return;
        }
        return id;
    }
    private static getResourceManagementClient(): ResourceManagementClient | undefined {
        console.log(`Initializing ResourceManagementClient`);
        const subscriptionId = this.getSubscription();
        if (!subscriptionId) { return undefined; }
        const resourceClient = new ResourceManagementClient(this.getCredentials(), subscriptionId);
        return resourceClient;
    }
    private static getResources(typeFilter?: string | undefined) {
        const resourceClient = this.getResourceManagementClient();
        if (!resourceClient) { return; }
        console.log(`Retrieving resources (filter: ${typeFilter})`);
        if (typeFilter) {
            return resourceClient.resources.list({ filter: typeFilter });
        } else {
            return resourceClient.resources.list();
        }
    }
    public static async getStorageAccounts(): Promise<GenericResourceExpanded[] | undefined> {
        console.log(`Retrieving storage accounts`);
        const storageAccountsResponse = this.getResources(`resourceType eq 'Microsoft.Storage/storageAccounts'`);
        if (!storageAccountsResponse) { return; }
        const storageAccounts = [];
        for await (const storageAccount of storageAccountsResponse) {
            storageAccounts.push(storageAccount);
        }
        return storageAccounts;
    }
    public static async getStorageAccountContainers(account: GenericResourceExpanded | undefined): Promise<ListContainerItem[] | undefined> {
        console.log(`Retrieving storage account container`);
        const subscriptionId = this.getSubscription();
        if (!subscriptionId) { return undefined; }
        const client = new StorageManagementClient(this.getCredentials(), subscriptionId);
        const storageAccountsResponse = client.blobContainers.list(this.getResourceGroupFromGenericResource(account as GenericResourceExpanded), account?.name as string);
        const storageAccountContainers = [];
        for await (const storageAccountContainer of storageAccountsResponse) {
            storageAccountContainers.push(storageAccountContainer);
        }
        return storageAccountContainers;
    }
    public static async getStorageAccountAccessKey(account: GenericResourceExpanded | undefined) {
        if (account === undefined) { return undefined; }
        const subscriptionId = this.getSubscription();
        if (!subscriptionId) { return undefined; }
        const client = new StorageManagementClient(this.getCredentials(), subscriptionId);
        const keys = (await client.storageAccounts.listKeys(this.getResourceGroupFromGenericResource(account), account.name as string)).keys;
        if (keys === undefined) { return undefined; }
        return keys[0];
    }
    public static async getStorageAccountContainers1(account: GenericResourceExpanded | undefined) {
        if (account === undefined) { return undefined; }
        const subscriptionId = this.getSubscription();
        if (!subscriptionId) { return undefined; }
        const client = new StorageManagementClient(this.getCredentials(), subscriptionId);
        await client.blobContainers.list(this.getResourceGroupFromGenericResource(account), account.name as string);
        const keys = (await client.storageAccounts.listKeys(this.getResourceGroupFromGenericResource(account), account.name as string)).keys;
        if (keys === undefined) { return undefined; }
        return keys[0];
    }
    public static getResourceGroupFromGenericResource(resource: GenericResourceExpanded): string {
        // ID = "/subscriptions/<GUID>/resourceGroups/<ResourceGroup>/providers/Microsoft.Storage/storageAccounts/<StorageAccount>"
        let resourceGroup = resource.id as string;
        resourceGroup = resourceGroup.substring(resourceGroup.indexOf(`/resourceGroups/`) + 16);
        resourceGroup = resourceGroup.substring(0, resourceGroup.indexOf(`/providers/`));
        return resourceGroup;
    }
    public static async generateStorageSasUrl(storageAccountName: string, storageAccountKey: string, expiresOn: Date, services: string = "b", types: string = "co", permissions: string = "rwdc"): Promise<string> {
        const token = await this.generateStorageSAS(storageAccountName, storageAccountKey, expiresOn, services, types, permissions);
        const sasUrl = `https://${storageAccountName}.blob.core.windows.net/?${token}`;
        return sasUrl;
    }
    public static async generateStorageSAS(storageAccountName: string, storageAccountKey: string, expiresOn: Date, services: string = "b", types: string = "co", permissions: string = "rwdc"): Promise<string> {
        const constants = {
            accountName: storageAccountName,
            accountKey: storageAccountKey
        };
        const sharedKeyCredential = new StorageSharedKeyCredential(
            constants.accountName,
            constants.accountKey
        );
        const sasOptions = {

            services: AccountSASServices.parse(services).toString(),          // blobs, tables, queues, files
            resourceTypes: AccountSASResourceTypes.parse(types).toString(),   // service, container, object
            permissions: AccountSASPermissions.parse(permissions),            // permissions
            protocol: SASProtocol.Https,                                      // protocols
            startsOn: new Date(),
            expiresOn: new Date(expiresOn),                                   // 120 minutes
        };
        const sasToken = generateAccountSASQueryParameters(
            sasOptions,
            sharedKeyCredential
        ).toString();
        return sasToken;
    }
}
class SubscriptionItem implements vscode.QuickPickItem {
    label: string;
    description = '';
    detail: string;
    subscription: Subscription;

    constructor(subscriptionItem: Subscription) {
        this.label = subscriptionItem.displayName as string;
        this.detail = subscriptionItem.subscriptionId as string;
        this.subscription = subscriptionItem;
    }
};