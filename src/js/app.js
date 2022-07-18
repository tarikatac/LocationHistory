// TODO: seperate css in webpack
import "./../scss/app.scss";

import "leaflet";

// models
import { User } from "./models/user"
import { DateFormatter } from "./models/dateFormatter";

// services import
import { createUserFromWebID, getIssuerFromWebID, getStorageFromWebID, getUserDataFromWebID } from "./services/webid";
import { loginUser, handleRedirectAfterLogin, isLoggedIn, logoutUser } from "./services/authenticate";
import { initMap, createMarkerFromUser, removeMarkerFromUser, moveMap, removeRouteFromUser, createRouteFromUser, removeMarkerSelf, createMarkerSelf } from "./services/map";
import { 
    createInbox,
    givePublicAccesstotheInbox,
    giveAccessoftheContainertoOwner,
    sendNotification,
    getRequestNotifications,
    approveAccess,
    revokeAccess,
    getAccessGrantedNotifications,
    getLatestLocation,
    putNewLocation,
    getLocationsBetweenTimestamps
} from "./services/locationHistory";

// ui elements imports
import { addFriendsCard, updateFriendsCard, removeFriendsCard } from "./ui/card";
import { displayLoginLoadingScreen, hideLoginLoadingScreen, hideLoginScreen, setLoginLoadingMessage, setLoginMessage, displayExtraLogin, hideExtraLogin } from "./ui/login";
import { displayRequestLocationLoading, hideRequestLocationLoading, setRequestLocationMessage } from "./ui/requestLocation"
import { addRequestNotification, removeRequestNotification, requestNotificationExists, updateRequestNotification } from "./ui/requestNotification"
import { displayUserMenu, hideUserMenu, initUserMenu, setUserMenuErrorMessage } from "./ui/userMenu";
import { addPostedLocationHistory, initPostedLocationHistory } from "./ui/postedLocationHistory";

var locator;

let first_time = true;
let posting_loc = false;

let currentUser;
let friendUsers = [];

async function init() {
    addEventListeners();

    // checks if the user is logged in and starts the mainloop
    handleRedirect();

    initMap();

    initUIElements();
}

function addEventListeners() {

    // login button
    document.getElementById('webid-login').addEventListener('click', onLoginClick);

    // post location button
    document.getElementById('start-posting').addEventListener('click', onPostLocationClick);

    // request locatin from webid button
    document.getElementById('req-frnd').addEventListener('click', onRequestLocationClick);

}

async function onLoginClick(event) {
    setLoginLoadingMessage("Getting user info from webID...");
    displayLoginLoadingScreen();

    try {
        let webid = document.getElementById('webid').value.trim();
        if(!webid) throw new Error("WebID is invalid");

        let oidcIssuer = document.getElementById('oidcIssuer').value.trim();
        let storage = document.getElementById('storage').value.trim();
        document.getElementById('oidcIssuer').value = null;
        document.getElementById('storage').value = null;

        if(!oidcIssuer) {
            oidcIssuer = await getIssuerFromWebID(webid);
        }

        if(!storage) {
            storage = await getStorageFromWebID(webid);
        }

        // if the storage or oidcIssuer triple was not found in the pod ask to fill it in
        if(!oidcIssuer || !storage) {
            if(!oidcIssuer && !storage) {
                setLoginMessage("pim:storage & solid:oidcIssuer location was not found in pod");
            } else if (!storage) {
                setLoginMessage("pim:storage location was not found in pod");
            } else if (!oidcIssuer) {
                setLoginMessage("solid:oidcIssuer location was not found in pod");
            }
            displayExtraLogin(oidcIssuer, storage);
        } else {
            let userData = await getUserDataFromWebID(webid);

            // add trailing '/' for urls
            if (oidcIssuer && oidcIssuer.substr(-1) != '/') oidcIssuer += '/';
            if (storage && storage.substr(-1) != '/') storage += '/';

            currentUser = new User(webid);
            currentUser.oidcIssuer = oidcIssuer;
            currentUser.storage = storage;
            currentUser.givenName = userData.givenName;
            currentUser.familyName = userData.familyName;
            currentUser.img = userData.img;

            console.log(currentUser);
            
            setLoginLoadingMessage("Logging in to Solid client...");
            
            // try login, if login failed: check if this user is already logged in.
            if(!await loginUser(currentUser)) {
                console.log(isLoggedIn(currentUser));
                // if this user is already logged in go immediatly to handleRedirect to handle this login
                // if this user is not yet logged in the previouse user will be logged out so the new one can log in
                if(isLoggedIn(currentUser.webid)) {
                    await handleRedirect();
                } else {
                    // TODO: there is an error when you first login with another user on the same oidcIssuer and then call logout
                    // the next login will login the previous user if the oidcIssuer logs you in automatic.
                    await logoutUser();
                    await loginUser(currentUser);
                }
            }
        }
        
        // check handleRedirectAfterLogin for further steps
    } catch(error) {
        hideLoginLoadingScreen();
        setLoginMessage(error.message);
    } finally {
        hideLoginLoadingScreen();
    }
}

async function onCheckboxChange(event) {
    // get the friend user and create/remove the marker based on checked status
    const i = friendUsers.findIndex(f => f.webid == event.currentTarget.webid);
    if(i >= 0) {
        if(event.currentTarget.checked) {
            friendUsers[i].showLocation = true;
            let loc = friendUsers[i].getLatestLocation();
            if(loc)
                createMarkerFromUser(loc, friendUsers[i]);
        } else {
            friendUsers[i].showLocation = false;
            removeMarkerFromUser(friendUsers[i]);
        }
    }
}

async function onPostLocationClick(event) {
    // TODO: if user is logged in check
    // TODO: update this func
    if(!posting_loc) {
        posting_loc = true;

        startPostingLocations();
        
        event.currentTarget.textContent = "Stop posting loc";
        event.currentTarget.classList.remove('green');
        event.currentTarget.classList.add('red');
    } else {
        posting_loc = false;

        stopPostingLocations();

        event.currentTarget.textContent = "Post Location History";
        event.currentTarget.classList.add('green');
        event.currentTarget.classList.remove('red');
        }
}

async function onRequestLocationClick(event) {
    setRequestLocationMessage("");
    displayRequestLocationLoading();

    
    let webid_frnd = document.getElementById('friend-webid').value;
    if(!webid_frnd) {   
        setRequestLocationMessage("Invalid WebID");
        hideRequestLocationLoading();
        return;
    } 

    try {
        const index = await addFriend(webid_frnd);

        // only send the notification if the friendUser is complete
        if(friendUsers[index].isUsable()) {
            try {
                await sendNotification(currentUser.webid, friendUsers[index].storage);
            } catch(error) {
                setRequestLocationMessage(error.message);
            }
        }
    } catch(e) {
        setRequestLocationMessage(e.message);
    }
    
    hideRequestLocationLoading();
}

async function onUserMenuUpdateClick(event) {
    const webid = document.getElementById("user-options-webid").innerHTML;
    if(!webid) {
        setUserMenuErrorMessage("WebID is invalid.");
        return;
    }

    // find the user
    const i = friendUsers.findIndex(f => f.webid == webid);

    let oidcIssuer = document.getElementById("user-options-oidcIssuer").value.trim();
    let storage = document.getElementById("user-options-storage").value.trim();

    // add trailing '/' for urls
    if (oidcIssuer && oidcIssuer.substr(-1) != '/') oidcIssuer += '/';
    if (storage && storage.substr(-1) != '/') storage += '/';

    // get view mode
    let viewMode = document.getElementById("user-options-view-mode").value;

    if(viewMode == 'route') {
        // get the date time;
        let fromDay = document.getElementById("user-options-from-day").value.trim();
        let fromTime = document.getElementById("user-options-from-time").value.trim();
        let toDay = document.getElementById("user-options-to-day").value.trim();
        let toTime = document.getElementById("user-options-to-time").value.trim();

        // create error message when date fields are invalid
        let msg = "";
        if(!DateFormatter.isValidDateFormat(fromDay))
            msg += "From Date, ";
        if(!DateFormatter.isValidTimeFormat(fromTime))
            msg += "From Time, ";
        if(!DateFormatter.isValidDateFormat(toDay))
            msg += "To Date, ";
        if(!DateFormatter.isValidTimeFormat(toTime))
            msg += "To Time, "
        if(msg != "") {
            setUserMenuErrorMessage(msg + "is invalid.");
            return;
        }

        
        friendUsers[i].displayTimeFrom = new DateFormatter(fromDay, fromTime);
        friendUsers[i].displayTimeTo = new DateFormatter(toDay, toTime);
    }

    // check if viewmode is changed
    if(friendUsers[i].displayMode != viewMode) {
        friendUsers[i].displayMode = viewMode;
    }
    

    // try to update the user when new issuer/storage was given
    if(oidcIssuer != friendUsers[i].oidcIssuer || storage != friendUsers[i].storage) {
        // update the friend
        friendUsers[i].oidcIssuer = oidcIssuer;
        friendUsers[i].storage = storage;

        updateFriendsCard(friendUsers[i], 'pending');

        let friendUser = friendUsers[i];

        // only send the notification if the friendUser is complete
        if(friendUsers[i].isUsable()) {
            try {
                await sendNotification(currentUser.webid, friendUsers[i].storage);
                friendUsers[i].statusMessage = null;
                displayUserMenu(friendUsers[i], 'Press update to apply changes');
            } catch(error) {
                friendUsers[i].statusMessage = error.message;
                displayUserMenu(friendUsers[i], error.message);
            }
            await updateFriendsAccessRights();
            await updateMap();
        } else {
            try {
                await addFriend(friendUsers.splice(i, 1)[0]);
            } catch(error) {
                displayUserMenu(friendUser, error.message);
            }
            
        }
    } else {
        await updateFriendsAccessRights();
        await updateMap();
    }            
}

async function onUserMenuDeleteClick(event) {
    const webid = document.getElementById("user-options-webid").innerHTML;
    if(!webid) {
        setUserMenuErrorMessage("WebID is invalid.");
        return;
    }

    // find the user
    const i = friendUsers.findIndex(f => f.webid == webid);
    let friendUser = friendUsers[i];

    // TODO: at the moment this is a temporary solution because it will still read the accessgreanted notification and create a new user
    // set status user is removed
    friendUsers[i].isRemoved = true;

    removeFriendsCard(friendUser);
    removeMarkerFromUser(friendUser);
    hideUserMenu();
}

// TODO: check code flow for when button is pressed (approve/revoke/requestNotification) access
async function onApproveButtonClick(event) {
    let button = event.currentTarget;
    let webid_frnd = event.currentTarget.webid;

    //add loading bar
    button.parentElement.parentElement.parentElement.querySelector(".progress").classList.remove("hidden");
    button.classList.add("hidden");

    let friend;
    try {
        friend = await createUserFromWebID(webid_frnd);
    } catch(error) {
        console.log(error);
        return;
    }

    // green button for accept, red button for decline/revoke
    if(button.classList.contains("green")) {

        try {
            await approveAccess(currentUser.webid, currentUser.storage, friend.webid, friend.storage);
        } catch(error) {
            removeRequestNotification(friend.webid);
            console.log(error);
        }

    }
    else {
        try {
            await revokeAccess(currentUser.webid, currentUser.storage, friend.webid, friend.storage);
            removeRequestNotification(friend.webid);
        } catch(error) {
            removeRequestNotification(friend.webid);
            console.log(error);
        }
    }
}

async function onFriendsCardClick(event) {
    const i = friendUsers.findIndex(f => f.webid == event.currentTarget.webid);
    if(i < 0)
        return;

    displayUserMenu(friendUsers[i], friendUsers[i].statusMessage);
    if(friendUsers[i].getLatestLocation())
        moveMap(friendUsers[i].getLatestLocation(), 9);
}

// checks if the user is logged in and starts the mainloop
async function handleRedirect() {
    setLoginLoadingMessage("Checking user...");
    displayLoginLoadingScreen();

    try {
        currentUser = await handleRedirectAfterLogin();

        if(currentUser === null)
            return;

        document.getElementById("webid").value = currentUser.webid;

        setLoginLoadingMessage("Creating inbox...");
        await createInbox(currentUser.storage);

        setLoginLoadingMessage("Setting inbox permissions...");
        await givePublicAccesstotheInbox(currentUser.storage);

        setLoginLoadingMessage("Giving access of the container to owner...");
        await giveAccessoftheContainertoOwner(currentUser.webid, currentUser.storage);

    } catch(error) {
        setLoginMessage(error.message);
        return;
    } finally {
        hideLoginLoadingScreen();
    }

    //successful login, start checking for notifications and friends periodically
    mainLoop();

    hideLoginLoadingScreen();
    hideLoginScreen();
}

// checks periodically for notifications and friends new locations
async function mainLoop() {

    await createRequestNotifications();

    await updateFriendsAccessRights();

    await updateMap();

    window.setTimeout(mainLoop, 1000);
}

// updates the map for each friend the user has access to. Only a new marker is shown when a location with a newer timestamp is found.
async function updateMap() {

    console.log("friends/updatemap");
    console.log(friendUsers);

    for(let i in friendUsers) {
        if(friendUsers[i].isUsable() && friendUsers[i].hasAccess) {

            let loc;
            try {
                loc = await getLatestLocation(friendUsers[i].storage);
            } catch (error) {
                updateFriendsCard(friendUsers[i], 'error', 'Failed retrieving location data');
                return;
            }

            if(loc) {
                
                // only if it is a new location => push to array and create marker
                let latest_loc = friendUsers[i].getLatestLocation();
                if(!latest_loc || latest_loc.timestamp < loc.timestamp) {
                    friendUsers[i].locations.push(loc);
                }

                // if checkbox is not checked it will not show the marker on the map
                if(friendUsers[i].showLocation) {
                    if(friendUsers[i].displayMode == 'marker') {
                        removeRouteFromUser(friendUsers[i]);

                        createMarkerFromUser(loc, friendUsers[i]);
                    } else if(friendUsers[i].displayMode == 'route') {
                        removeMarkerFromUser(friendUsers[i]);

                        // check if these locations are already stored, then we dont need to retrieve them again
                        let locs = friendUsers[i].getLocations(friendUsers[i].displayTimeFrom.getTime(), friendUsers[i].displayTimeTo.getTime());
                        locs = await getLocationsBetweenTimestamps(friendUsers[i].storage, friendUsers[i].displayTimeFrom.getTime(), friendUsers[i].displayTimeTo.getTime(), locs.map(x => x.timestamp));

                        friendUsers[i].addLocations(locs);

                        createRouteFromUser(friendUsers[i], friendUsers[i].displayTimeFrom, friendUsers[i].displayTimeTo);
                    }

                    // move the map to the first friend you have access to
                    if(first_time) {
                        moveMap(loc, 9);
                        first_time = false;
                    }
                }
            }
        }

        // if checkbox is unchecked do not show the marker
        if(!friendUsers[i].showLocation) {
            removeMarkerFromUser(friendUsers[i]);
            removeRouteFromUser(friendUsers[i]);
        }
    }
}

async function updateFriendsAccessRights() {
    let haveAccess;
    try {
        haveAccess = await getAccessGrantedNotifications(currentUser.storage);

        console.log("haveAccess");
        console.log(haveAccess);

        // remove/update access
        for(let i in friendUsers) {
            if(friendUsers[i].isUsable()) {
                let j = haveAccess.findIndex(f => f.webid == friendUsers[i].webid);
                if(j >= 0) {
                    friendUsers[i].hasAccess = true;
                    updateFriendsCard(friendUsers[i], 'done');
                } else {
                    friendUsers[i].hasAccess = false;
                    updateFriendsCard(friendUsers[i], 'revoked');
                }
            }
        }

        // add access
        for(let friend of haveAccess) {
            // TODO: atm it is possible to request access from self
            if(friend.webid == currentUser.webid)
                return;

            // check if not already in friend list
            let i = friendUsers.findIndex(f => f.webid == friend.webid);
            if(i == -1) {
                let index;
                try {
                    index = await addFriend(friend.webid);
                } catch(error) {
                    console.log(error);
                }
                
                // only set hasaccess when the friendUser is complete
                if(friendUsers[index].isUsable()) {
                    friendUsers[index].hasAccess = true;
                }
            } else if(friendUsers[i].isUsable()) {
                friendUsers[i].hasAccess = true;
                updateFriendsCard(friendUsers[i], 'done');
            }
        }

    } catch(error) {
        console.log(error);
        return;
    }
}

// TODO: show the name of the user (make the requestNotification functions use the user object)
async function createRequestNotifications() {
    let new_requests = {};
    try {
        new_requests = await getRequestNotifications(currentUser.storage);

        console.log("requests");
        console.log(new_requests);

        // make a notification for all the requests

        for(let webid in new_requests) {
            if(!requestNotificationExists(webid)) {
                addRequestNotification(webid, onApproveButtonClick);
            }
            if(new_requests[webid]) {
                updateRequestNotification(webid);
            }
        } 

        requests = new_requests;
    } catch(error) {
        console.log(error);
    }   
}

// check every x seconds if the current position is changed. Only if it is changed post this new location
async function startPostingLocations() {
    if (navigator.geolocation) {
        locator = navigator.geolocation.watchPosition(async (pos) => {
            // success

            // only if it is a new location
            let latest_loc = currentUser.getLatestLocation();
            if(!latest_loc || (latest_loc.timestamp < pos.timestamp && latest_loc.lat != pos.coords.latitude && latest_loc.long != pos.coords.longitude)) {
                currentUser.locations.push({lat: pos.coords.latitude, long: pos.coords.longitude, timestamp: pos.timestamp});

                addPostedLocationHistory(pos.coords.latitude, pos.coords.longitude, pos.timestamp);
                createMarkerSelf(pos.coords.latitude, pos.coords.longitude);

                const platform = navigator.platform.split(" ").join('');
                await putNewLocation(currentUser.webid, currentUser.storage, {lat: pos.coords.latitude, long: pos.coords.longitude, timestamp: pos.timestamp}, platform);

            }
        }, (err) => {
            //error
            console.log('Unable to retrieve your location');
        }, {
            enableHighAccuracy: true,
            timeout: Infinity,
            maximumAge: 0
        });

        // clearInterval(locator);
        // locator = setInterval(() => {
        //     navigator.geolocation.getCurrentPosition(async (pos) => {
        //         // success

        //         // only if it is a new location
        //         let latest_loc = currentUser.getLatestLocation();
        //         if(!latest_loc || (latest_loc.timestamp < pos.timestamp && latest_loc.lat != pos.coords.latitude && latest_loc.long != pos.coords.longitude)) {
        //             currentUser.locations.push({lat: pos.coords.latitude, long: pos.coords.longitude, timestamp: pos.timestamp});

        //             addPostedLocationHistory(pos.coords.latitude, pos.coords.longitude, pos.timestamp);
        //             createMarkerSelf(pos.coords.latitude, pos.coords.longitude);
    
        //             const platform = navigator.platform.split(" ").join('');
        //             await putNewLocation(currentUser.webid, currentUser.storage, {lat: pos.coords.latitude, long: pos.coords.longitude, timestamp: pos.timestamp}, platform);
    
        //         }
        //     }, (err) => {
        //         //error
        //         console.log('Unable to retrieve your location');
        //     }, {
        //         enableHighAccuracy: true,
        //         timeout: Infinity,
        //         maximumAge: 0
        //     });
        // }, 1000);
        
       
    } else {
        // TODO: show message posting location is not possible
    }
}

function stopPostingLocations() {

    // clearInterval(locator);

    navigator.geolocation.clearWatch(locator);

    removeMarkerSelf();
}

//returns an index of friendUsers
async function addFriend(webid) {

    // check if friend not already exist
    let friendUser;
    let i = friendUsers.findIndex(f => f.webid == webid);
    if(i >= 0) {
        friendUsers[i].isRemoved = false;
        friendUser = friendUsers[i];
    } else {
        // create user object with available info in pod
        friendUser = new User(webid);

        friendUser = await createUserFromWebID(webid);

        i = friendUsers.push(friendUser) - 1;
    }

    

    addFriendsCard(friendUser, onFriendsCardClick, onCheckboxChange, 'pending');

    if(!friendUser.isUsable()) {
        updateFriendsCard(friendUser, 'error');

        let msg;
        if(!friendUser.oidcIssuer && !friendUser.storage) {
            msg = "Could not access solid:oidcIssuer & pim:storage";
        } else if(!friendUser.oidcIssuer) {
            msg = "Could not access solid:oidcIssuer";
        } else if (!friendUser.storage) {
            msg = "Could not access pim:storage";
        }
        friendUsers[i].statusMessage = msg;
        displayUserMenu(friendUser, msg);
        
    } else {
        updateFriendsCard(friendUser, 'done');
    }

    return i;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function initUIElements() {
    document.addEventListener('DOMContentLoaded', function() {
        initUserMenu(onUserMenuUpdateClick, onUserMenuDeleteClick);
        initPostedLocationHistory();

        var elemsSelect = document.querySelectorAll('select');
        M.FormSelect.init(elemsSelect);

        var elemsDatePicker = document.querySelectorAll('.datepicker');
        M.Datepicker.init(elemsDatePicker, { format: 'yyyy/mm/dd' });

        var elemsTimePicker = document.querySelectorAll('.timepicker');
        M.Timepicker.init(elemsTimePicker, { twelveHour: false });
      });    
}

init();