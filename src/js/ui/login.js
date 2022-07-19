export function setLoginMessage(text) {
    let login_message = document.getElementById('login-message');
    login_message.textContent = text;
    login_message.classList.remove("invisible");
}

export function setLoginLoadingMessage(text) {
    let login_loading_message = document.getElementById("login-loading-message");
    login_loading_message.textContent = text;
}

export function displayLoginLoadingScreen() {
    // hideExtraLogin();
    document.getElementById("login-loading").classList.remove("hidden");
    document.getElementById("login-content").classList.add("invisible");
}

export function hideLoginLoadingScreen() {
    document.getElementById("login-loading").classList.add("hidden");
    document.getElementById("login-content").classList.remove("invisible");
}

export function hideLoginScreen() {
    document.getElementById('login').classList.add('hidden');
}

export function displayExtraLogin(oidcIssuer, storage) {
    document.getElementById("oidcIssuer").value = oidcIssuer;
    document.getElementById("storage").value = storage;

    document.getElementById("login-input").classList.add("hidden");
    document.getElementById("login-input-extra").classList.remove("hidden");
}

export function hideExtraLogin() {
    document.getElementById("login-input-extra").classList.add("hidden");
    document.getElementById("login-input").classList.remove("hidden");
}