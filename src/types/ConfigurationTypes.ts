export interface IPrincipalSets {
    defaults: IPrincipalSet[]
};
export interface IPrincipalSet {
    countryCode: string,
    values: IPrincipal[]
};
export interface IPrincipal {
    principalType: string,
    principalId: string
}
export interface IManifestAppEntry {
    id: string,
    initialVersion: string,
    name: string,
    publisher: string,
    allowedUpdates: string,
    publishOnly: boolean,
    blockUninstall: boolean
}
export interface IManifestLinks{
    baseHelpUrl: string,
    baseHelpSearchUrl: string,
    communityUrl: string,
    feedbackUrl: string,
    legalUrl: string,
    privacyUrl: string,
    signInHelpUrl: string,
    comingSoonUrl: string,
    blogUrl: string,
    contactSalesUrl: string
}