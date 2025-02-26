export const onLaunchWebAuthFlow = async () => {
    return new Promise((resolve, reject) => {
        const clientId = "650198074640-ndskhk7q7u831es5bvjg4sc1s2e0rgn7.apps.googleusercontent.com";
        const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org`;
        const state = Math.random().toString(36).substring(7);
        const scopes = "https://www.googleapis.com/auth/spreadsheets.currentonly https://www.googleapis.com/auth/drive.file";

        const authUrl = new URL("https://accounts.google.com/o/oauth2/auth");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", scopes);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("include_granted_scopes", "true");
        authUrl.searchParams.set("prompt", "consent");

        chrome.tabs.query({ active: true, currentWindow: true }, ([initTab]) => {



            // Open the auth URL in a new tab
            chrome.tabs.create({ url: authUrl.href }, (tab) => {
                const tabId = tab.id;

                // Listen for tab updates to detect redirection
                chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
                    if (updatedTabId === tabId && changeInfo.url && changeInfo.url.startsWith(redirectUri)) {
                        console.log("Redirect URL Captured:", changeInfo.url);

                        const params = new URLSearchParams(new URL(changeInfo.url).search);
                        const code = params.get("code");

                        if (!code) {
                            reject(new Error("No auth code found in the redirect URL"));
                            return;
                        }

                        // Remove the listener and close the tab

                        chrome.tabs.highlight({ tabs: [initTab.index] }, () => {
                            chrome.tabs.onUpdated.removeListener(listener);
                            chrome.tabs.remove(tabId);
                        })
                        chrome.action.openPopup()
                        resolve(code)
                    }
                });
            });
        })
    });
};


export async function getToken() {
    return await new Promise((resolve, reject) => {

        chrome.storage.local.get(["accessToken", "refreshToken", "expiresAt"], async (items) => {
            const { accessToken, refreshToken, expiresAt } = items;

            if (accessToken) {
                const nowInSeconds = Math.floor(Date.now() / 1000);
                const nowPlus60 = nowInSeconds + 60;

                // expired or will expire in the next 60 seconds
                if (expiresAt <= nowPlus60) {
                    const response = await fetch(`https://tezi-extension.hamzaravani4.workers.dev/api/auth/refresh`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            refresh_token: refreshToken,
                        }),
                    });
                    if (response.ok) {
                        const { accessToken, expiresAt } = await response.json();
                        chrome.storage.local.set({ accessToken, expiresAt });

                        console.log("Access token refreshed");
                        resolve(accessToken);

                    } else {
                        const data = await response.json();
                        console.error("request failed: ", data);
                    }
                } else {
                    console.log("Access token is still valid");
                    resolve(accessToken);
                }

            }
        })
    });

}