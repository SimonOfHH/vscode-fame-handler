# vscode-fame-handler README

Coming soon...

## Features

Coming soon...

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

This extension contributes the following settings:

* `famehandler.api.clientId`: tbd
* `famehandler.api.tenantId`: tbd
* `famehandler.defaults.principalSets`: tbd

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