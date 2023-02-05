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
    setDataCommand: getCommandName("setDataCommand"),
    getContextCommand: getCommandName("getContextCommand"),
    updateVersionCommand: getCommandName("updateAppVersion"),
    addAppPrincipalCommand: getCommandName("addAppPrincipalCommand"),
    updateAppPrincipalCommand: getCommandName("updateAppPrincipalCommand"),
    removeAppPrincipalCommand: getCommandName("removeAppPrincipalCommand"),
    validateManifestCommand: getCommandName("validateManifestCommand"),
    statusBarUpdateCommand: getCommandName("statusBarUpdateCommand"),
    downloadAppVersionCommand: getCommandName("downloadAppVersionCommand"),
    testUserCommand:getCommandName("testUserCommand")
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
    showPlaceholder:getSettingName("showPlaceholder")
};