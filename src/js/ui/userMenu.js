// TODO: create user menu when click on user

let user_menu;
let nameField;
let webidField;
let oidcIssuerField;
let storageField;
let updateButton;
let deleteButton;
let errorField;

export function initUserMenu(onUserMenuUpdateClick, onUserMenuDeleteClick) {
    user_menu = document.getElementById("user-menu");
    document.getElementById("user-menu-close-button").addEventListener("click", (event) => {
        hideUserMenu();
    });

    nameField = document.getElementById("user-options-name");
    webidField = document.getElementById("user-options-webid");
    oidcIssuerField = document.getElementById("user-options-oidcIssuer");
    storageField = document.getElementById("user-options-storage");
    updateButton = document.getElementById("user-options-update");
    deleteButton = document.getElementById("user-options-delete");
    errorField = document.getElementById("user-options-error");

    updateButton.addEventListener("click", onUserMenuUpdateClick);
    deleteButton.addEventListener("click", onUserMenuDeleteClick);
}

export function displayUserMenu(user, message) {
    if(!user)
        return;
    
    nameField.innerHTML = user.name;
    webidField.innerHTML = user.webid;
    oidcIssuerField.value = user.oidcIssuer;
    storageField.value = user.storage;

    if(message)
        errorField.innerHTML = message;
    else
        errorField.innerHTML = 'Press update to apply changes';

    user_menu.classList.remove("hidden");
}

export function hideUserMenu() {
    user_menu.classList.add("hidden");
}

export function setUserMenuErrorMessage(message) {
    errorField.innerHTML = message;
}