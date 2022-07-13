import {
    login,
    logout,
    handleIncomingRedirect,
    getDefaultSession,
} from "@inrupt/solid-client-authn-browser";

import { User } from "../models/user";

export async function logoutUser() {
    try {
        await logout();
    } catch(error) {
        console.log("logout failed");
    }
}

export function isLoggedIn(webid) {
    return getDefaultSession().info.webId == webid;
}

export async function loginUser(user) {
    if(user) {
        // store the user in the session storage so it can be used when redirected
        window.sessionStorage.setItem('currentUser', JSON.stringify(user));

        // if not already logged in
        if (!getDefaultSession().info.isLoggedIn) {

            try {
                await login({
                    oidcIssuer: user.oidcIssuer,
                    redirectUrl: window.location.href,
                    clientName: "LocationHistory"
                });
                return true;
            } catch(error) {
                throw new Error("Error logging in, check if solid:oidcIssuer is correct");
            }
        } else {
            return false;
        }
    }
}

export async function handleRedirectAfterLogin() {
    try {
        await handleIncomingRedirect();
    } catch(error) {
        throw new Error("Error handling incoming redirect");
    }

    if (getDefaultSession().info.isLoggedIn) {
        const user = window.sessionStorage.getItem("currentUser");
        if(user) {
            try {
                return JSON.parse(user);
            } catch(error) {
                throw new Error("Could not get login info after redirect");
            }
        } else {
            throw new Error("Could not get login info after redirect");
        }
    } else {
        return null;
    }
}