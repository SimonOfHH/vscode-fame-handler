//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState() || { colors: [] };

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'setData':
                {
                    setData(message.arguments);
                    break;
                }

        }
    });
    /** 
     * @param {string[]} dataAsString
     */
    function setData(dataAsString) {
        const codePlaceholder = document.getElementById('code-placeholder');
        let pretty = "";
        for (const [i, entry] of Object.entries(dataAsString)) {
            if (entry) {
                try {
                    const parsedEntry = JSON.parse(entry);
                    const pretty2 = JSON.stringify(parsedEntry, null, 2);
                    if (pretty) {
                        pretty = pretty.concat(",\n");
                    }
                    pretty = pretty.concat(pretty2);
                } catch (error) {
                    console.error("Invalid JSON:", error);
                }
            }
        }
        //dataPlaceholder.innerHTML = dataAsString;
        codePlaceholder.innerHTML = pretty;
    }
}());
