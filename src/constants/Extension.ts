export const EXTENSION_PUBLISHER = "SimonOfHH";
export const EXTENSION_ID = "vscode-fame-handler";
export const VSCMD_PREFIX = "famehandler";

export const getCommandName = (command: string) => {
    return `${VSCMD_PREFIX}.${command}`;
};
export const getViewName = (view: string) => {
    return `${VSCMD_PREFIX}.${view}`;
};
export const getSettingName = (setting: string) => {
    return `${setting}`;
};
export const COMMAND_NAME = {
    signInCommand: getCommandName("signInCommand"),
    clearCacheCommand: getCommandName("clearCacheCommand"),
    exportAppMapCommand: getCommandName("exportAppMapCommand"),
    importAppMapCommand: getCommandName("importAppMapCommand"),
    loadAllAppInfoCommand: getCommandName("loadAllAppInfoCommand"),
    refreshEntryCommand: getCommandName("refreshEntryCommand"),
    uploadAppVersionCommand: getCommandName("uploadAppVersionCommand"),
    uploadAppsFromDirectoryCommand: getCommandName("uploadAppsFromDirectoryCommand"),
    setDataCommand: getCommandName("setDataCommand"),
    sortAppsByIdCommand: getCommandName("sortAppsByIdCommand"),
    sortAppsByNameCommand: getCommandName("sortAppsByNameCommand"),
    sortAppsByOriginalOrderCommand: getCommandName("sortAppsByOriginalOrderCommand"),
    assignAppToCountryCommand: getCommandName("assignAppToCountryCommand"),
    updateVersionCommand: getCommandName("updateAppVersionCommand"),
    addAppPrincipalCommand: getCommandName("addAppPrincipalCommand"),
    updateAppPrincipalCommand: getCommandName("updateAppPrincipalCommand"),
    removeAppPrincipalCommand: getCommandName("removeAppPrincipalCommand"),
    validateManifestCommand: getCommandName("validateManifestCommand"),
    statusBarUpdateCommand: getCommandName("statusBarUpdateCommand"),
    downloadAppVersionCommand: getCommandName("downloadAppVersionCommand"),
    inspectAppVersionNavxCommand: getCommandName("inspectAppVersionNavxCommand"),
    scheduleEnvironmentHotfixFromEnvironmentCommand: getCommandName("scheduleEnvironmentHotfixFromEnvironmentCommand"),
    scheduleEnvironmentHotfixFromVersionCommand: getCommandName("scheduleEnvironmentHotfixFromVersionCommand"),
    updateEnvironmentHotfixCommand: getCommandName("updateEnvironmentHotfixCommand"),
    createDatabaseExportSasCommand: getCommandName("createDatabaseExportSasCommand"),
    selectAzureSubscription: getCommandName("selectAzureSubscription")
};
export const VIEWS = {
    appsView: getViewName("appsView"),
    detailsView: getViewName("detailsView")
};
export const SETTINGS = {
    key: VSCMD_PREFIX,
    d365ApiClientId: getSettingName("api.clientId"),
    d365ApiTenantId: getSettingName("api.tenantId"),
    principalSets: getSettingName("defaults.principalSets"),
    showPlaceholder: getSettingName("showPlaceholder"),
    countrySelection: getSettingName("defaults.countrySelection"),
    azureSubscriptionId: getSettingName("azureSubscriptionId")
};