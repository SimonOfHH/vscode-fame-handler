# vscode-fame-handler

This VS Code Extension provides some functionality to make working with App Management APIs for Microsofts Embed App program easier. It'S still a work-in-progress, so expect some placeholder etc. in the code.

## Usage

Just select the provided view "FAME Handler" and click "Sign in". It'll open up a new browser window and acquire a token for accessing the API.
![Sign in sample](https://raw.githubusercontent.com/SimonOfHH/vscode-fame-handler/main/documentation/media/sign-in-load.gif)

## Features

* UI for API results, to inspect
  * Apps
  * Versions
  * Principals
  * Environments
* Validate manifest.json for new LCS releases
* Provide new versions, update principals and more with an easy to use interface

more tbd...

## Requirements

You need an Azure App registration with the following permissions:
* Dynamics 365 Business Central -> Delegated permissions -> user_impersonation
* Microsoft Graph -> Delegated permissions -> User.Read.All (used to provide a lookup from principals to display Usernames)

## Extension Settings

This extension contributes the following settings:

* `famehandler.api.clientId`: The application (client) ID from the AAD App registration
* `famehandler.api.tenantId`: Directory (tenant) ID
* `famehandler.defaults.principalSets`: A set of preconfigured princiapls for easier assignments

Sample configuration:
```
"famehandler.api.clientId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
"famehandler.api.tenantId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
"famehandler.defaults.principalSets": {
        "defaults": [
            {
                "countryCode": "DE",
                "values": [
                    {
                        "principalType": "user",
                        "principalId": "00000000-0000-0000-0000-000000000000"
                    },
                    {
                        "principalType": "user",
                        "principalId": "11111111-1111-1111-1111-111111111111"
                    },
                    {
                        "principalType": "user",
                        "principalId": "22222222-2222-2222-2222-222222222222"
                    }
                ]
            },
            {
                "countryCode": "NL",
                "values": [
                    {
                        "principalType": "user",
                        "principalId": "33333333-3333-3333-3333-333333333333"
                    },
                    {
                        "principalType": "user",
                        "principalId": "44444444-4444-4444-4444-444444444444"
                    },
                    {
                        "principalType": "user",
                        "principalId": "55555555-5555-5555-5555-555555555555"
                    }
                ]
            }
        ]
    }
```

## Known Issues

<...>

## Release Notes

Users appreciate release notes as you update your extension.

### 0.0.1

Initial release of vscode-fame-handler extension