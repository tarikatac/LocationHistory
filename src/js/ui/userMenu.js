import { DateFormatter } from "../models/dateFormatter";

let user_menu;
let nameField;
let webidField;
let oidcIssuerField;
let storageField;
let viewModeField;
let fromDayField;
let fromTimeField;
let toDayField;
let toTimeField;
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
    viewModeField = document.getElementById("user-options-view-mode");
    fromDayField = document.getElementById("user-options-from-day");
    fromTimeField = document.getElementById("user-options-from-time");
    toDayField = document.getElementById("user-options-to-day");
    toTimeField = document.getElementById("user-options-to-time");

    const now = new DateFormatter();
    fromDayField.value = now.getFormattedDate();
    toDayField.value = now.getFormattedDate();
    fromTimeField.value = "00:00";
    toTimeField.value = "23:59";

    updateButton.addEventListener("click", onUserMenuUpdateClick);
    deleteButton.addEventListener("click", onUserMenuDeleteClick);
}

export function displayUserMenu(user, message) {
    if(!user)
        return;
    
    nameField.innerHTML = user.name;
    webidField.value = user.webid;
    oidcIssuerField.value = user.oidcIssuer;
    storageField.value = user.storage;

    fromDayField.value = user.displayTimeFrom.getFormattedDate();
    toDayField.value = user.displayTimeTo.getFormattedDate();
    fromTimeField.value = user.displayTimeFrom.getFormattedTime();
    toTimeField.value = user.displayTimeTo.getFormattedTime();

    viewModeField.value = user.displayMode;


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