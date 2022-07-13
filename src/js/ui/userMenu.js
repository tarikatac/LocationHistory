// TODO: create user menu when click on user

let user_menu;
let nameField;
let webidField;
let oidcIssuerField;
let storageField;
let updateButton;
let deleteButton;
let errorField;

let deleteFunc;
let updateFunc;

export function initUserMenu() {
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

    updateButton.addEventListener("click", updateFunc);
    deleteButton.addEventListener("click", deleteFunc);
}

export function displayUserMenu(user, onUserMenuUpdateClick, onUserMenuDeleteClick, message = 'Press update to apply changes') {
    if(!user)
        return;
    
    nameField.innerHTML = user.name;
    webidField.innerHTML = user.webid;
    oidcIssuerField.value = user.oidcIssuer;
    storageField.value = user.storage;
    errorField.innerHTML = message;

    updateFunc = onUserMenuUpdateClick;
    deleteFunc = onUserMenuDeleteClick;
    

    user_menu.classList.remove("hidden");
}

export function hideUserMenu() {
    user_menu.classList.add("hidden");
}

export function setUserMenuErrorMessage(message) {
    errorField.innerHTML = message;
}