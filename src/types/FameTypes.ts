export interface IFameAppArray {
    value: IFameApp[]
}
export interface IFameAppCountryArray {
    value: IFameAppCountry[]
}
export interface IFameAppPrincipalArray {
    value: IFameAppPrincipal[]
}
export interface IFameAppVersionArray {
    value: IFameAppVersion[]
}
export interface IFameAppEnvironmentArray {
    value: IFameAppEnvironment[]
}
export interface IFameApp {
    id: string,
    publisher: string,
    publisherAadTenantId: string,
    publisherContactEmail: string,
    storageLocation: string,
    name: string
}
export interface IFameAppCountry {
    countryCode: string
}
export interface IFameAppPrincipal {
    id: string,
    type: string,
    aadTenantId: string,
    roles: string[],
    name:string
}
export interface IFameAppVersion {
    version: string,
    appId: string,
    countryCode: string,
    packageId: string,
    publisher: string,
    name: string,
    uploadedOn: string,
    availability: string,
    status: string,
    dependencies: IFameAppDependency[],
    majorVersion: number,
    minorVersion: number,
    buildVersion: number,
    revisionVersion: number
}
export interface IFameAppDependency {
    version: string,
    appId: string,
    publisher: string,
    name: string
}
export interface IFameAppEnvironment {
    aadTenantId: string,
    version: string,
    appId: string,
    countryCode: string,
    applicationFamily: string,
    locationName: string,
    name: string,
    type: string
}