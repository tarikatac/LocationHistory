// TODO: seperate css in webpack
import "./../scss/app.scss";

import "leaflet";

import { User } from "./models/user"

// services import
import { createUserFromWebID } from "./services/webid";
import { loginUser, handleRedirectAfterLogin } from "./services/authenticate";
import { initMap, createMarkerFromUser, removeMarkerFromUser, moveMap } from "./services/map";
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
    putNewLocation
} from "./services/locationHistory";

// ui elements imports
import { addFriendsCard, updateFriendsCard, removeFriendsCard } from "./ui/card";
import { displayLoginLoadingScreen, hideLoginLoadingScreen, hideLoginScreen, setLoginLoadingMessage, setLoginMessage } from "./ui/login";
import { displayRequestLocationLoading, hideRequestLocationLoading, setRequestLocationMessage } from "./ui/requestLocation"
import { addRequestNotification, removeRequestNotification, requestNotificationExists, updateRequestNotification } from "./ui/requestNotification"

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
        let webid = document.getElementById('webid').value;
        webid = webid.trim();
        if(!webid) throw new Error("WebID is invalid");
        currentUser = await createUserFromWebID(webid);
        
        setLoginLoadingMessage("Logging in to Solid client...");
        await loginUser(currentUser);
        
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
            let loc = friendUsers[i].locations.length > 0 ? friendUsers[i].locations[friendUsers[i].locations.length - 1] : null;
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

    try {
        let webid_frnd = document.getElementById('friend-webid').value;
        if(!webid_frnd) throw new Error("Invalid WebID");

        // create user object with available info in pod
        let friendUser = await createUserFromWebID(webid_frnd);
        friendUsers.push(friendUser);

        await sendNotification(currentUser.webid, friendUser.storage);


        addFriendsCard(friendUser, onCheckboxChange);

    } catch(error) {
        setRequestLocationMessage(error.message);
    } finally {
        hideRequestLocationLoading();
    }

    hideRequestLocationLoading();
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

// checks if the user is logged in and starts the mainloop
async function handleRedirect() {
    setLoginLoadingMessage("Checking user...");
    displayLoginLoadingScreen();

    try {
        currentUser = await handleRedirectAfterLogin();

        if(currentUser === null)
            return;

        setLoginLoadingMessage("Creating inbox...");
        // displayLoginLoadingScreen();
        await createInbox(currentUser.storage);

        setLoginLoadingMessage("Setting inbox permissions...");
        await givePublicAccesstotheInbox(currentUser.storage);

        setLoginLoadingMessage("Giving access of the container to owner...");
        await giveAccessoftheContainertoOwner(currentUser.webid, currentUser.storage);

    } catch(error) {
        setLoginMessage(error.message);
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

    window.setTimeout(mainLoop, 5000);
}

// updates the map for each friend the user has access to. Only a new marker is shown when a location with a newer timestamp is found.
async function updateMap() {

    console.log("friends/updatemap");
    console.log(friendUsers);

    for(let i in friendUsers) {
        let user = friendUsers[i];
        if(user.hasAccess) {
            const loc = await getLatestLocation(user.storage);
            if(loc) {
                // only if it is a new location => push to array and create marker
                let latest_loc = friendUsers[i].locations.length > 0 ? friendUsers[i].locations[friendUsers[i].locations.length - 1] : null;
                if(!latest_loc || latest_loc.timestamp < loc.timestamp) {
                    friendUsers[i].locations.push(loc);

                    // if checkbox is not checked it will not show the marker on the map
                    if(user.showLocation) {
                        
                        // move the map to the first friend you have access to
                        if(first_time) {
                            moveMap(loc, 9);
                            first_time = false;
                        }

                        createMarkerFromUser(loc, user);
                    }
                }
            }
        }

        // if checkbox is unchecked do not show the marker
        if(!user.showLocation) {
            removeMarkerFromUser(user);
        }
    }
}

async function updateFriendsAccessRights() {
    let haveAccess;
    try {
        haveAccess = await getAccessGrantedNotifications(currentUser.storage);

        console.log("haveAccess");
        console.log(haveAccess);

        // TODO: check when cards need to be removed, maybe add a pending status

        // remove/update access
        for(let i in friendUsers) {
            let j = haveAccess.findIndex(f => f.webid == friendUsers[i].webid);
            if(j >= 0) {
                friendUsers[i].hasAccess = true;
            } else {
                friendUsers[i].hasAccess = false;
                removeFriendsCard(friendUsers[i]);
            }
        }

        // add access
        for(let friend of haveAccess) {
            // TODO: atm it is possible to request access from self
            if(friend.webid == currentUser.webid)
                return;

            // check if not already in friend list
            let friendUser;
            let i = friendUsers.findIndex(f => f.webid == friend.webid);
            if(i == -1) {
                // not yet in friend list => get info with the webid;
                friendUser = await createUserFromWebID(friend.webid);
                friendUser.hasAccess = true;
                friendUsers.push(friendUser);
            } else {
                friendUsers[i].hasAccess = true;
                friendUser = friendUsers[i];
            }
            addFriendsCard(friendUser, onCheckboxChange);
            updateFriendsCard(friendUser);
        }

    } catch(error) {
        console.log(error);
        return;
    }
}

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

// TODO: make the link move this map to the location & clean up look
function addPostedLocationHistory(lat, long, timestamp) {
    let collection = document.getElementById('posted-locations');
    let a = document.createElement('a');
    a.href = "https://www.openstreetmap.org/#map=18/" + lat + "/" + long;
    a.textContent = " Latitude:" + lat + "°, Longitude:" + long + "°,Timestamp:" + timestamp;
    a.classList.add("collection-item");
    collection.insertBefore(a, collection.firstChild);
}

async function startPostingLocations() {
    var optn = {
        enableHighAccuracy: true,
        timeout: Infinity,
        maximumAge: 0
    };
    if (navigator.geolocation) {
        locator = navigator.geolocation.watchPosition(async function (position) {

            addPostedLocationHistory(position.coords.latitude, position.coords.longitude, position.timestamp);

            const platform = navigator.platform.split(" ").join('');
            await putNewLocation(currentUser.webid, currentUser.storage, {lat: position.coords.latitude, long: position.coords.longitude, timestamp: position.timestamp}, platform);

        }, async function error() {
            console.log('Unable to retrieve your location');
        }, optn);
    } else {
        // TODO: show message posting location is not possible
    }
}

function stopPostingLocations() {
    navigator.geolocation.clearWatch(locator);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

init();