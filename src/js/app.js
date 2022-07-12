// TODO: seperate css in webpack
import "./../scss/app.scss";

import "leaflet";

// TODO: create seprate functions for the event handlers

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

var locator;

let first_time = true;
let posting_loc = false;
let login_button, post_location_button, req_frnd_button;
let currentUser;
let friendUsers = [];

async function init() {
    // initialize variables for DOM objects
    login_button = document.getElementById('webid-login');
    post_location_button = document.getElementById('start-posting');
    req_frnd_button = document.getElementById('req-frnd');

    addEventListeners();

    // checks if the user is logged in and starts the mainloop
    handleRedirect();

    initMap();
}

function addEventListeners() {
    login_button.addEventListener('click', async () => {

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
    });

    post_location_button.addEventListener('click', async () => {
        // TODO: if user is logged in check
        // TODO: update this func
        if(!posting_loc) {
            posting_loc = true;

            startPostingLocations();
            
            post_location_button.textContent = "Stop posting loc";
            post_location_button.classList.remove('green');
            post_location_button.classList.add('red');
        } else {
            posting_loc = false;
            navigator.geolocation.clearWatch(locator);
            post_location_button.textContent = "Post Location History";
            post_location_button.classList.add('green');
            post_location_button.classList.remove('red');
        }
        
    });

    req_frnd_button.addEventListener('click', async () => {

        setReqMessage("");
        displayRequestLoading();

        try {
            let webid_frnd = document.getElementById('friend-webid').value;
            if(!webid_frnd) throw new Error("Invalid WebID");

            // create user object with available info in pod
            let friendUser = await createUserFromWebID(webid_frnd);
            friendUsers.push(friendUser);

            await sendNotification(currentUser.webid, friendUser.storage);


            addFriendsCard(friendUser);

        } catch(error) {
            setReqMessage(error.message);
        } finally {
            hideRequestLoading();
        }

        hideRequestLoading();
    });

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
            addFriendsCard(friendUser);
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
                addRequestNotification(webid);
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

function requestNotificationExists(webid) {
    return document.getElementById("req_" + webid) ? true : false;
}

function addRequestNotification(webid) {
    let requests_list = document.querySelector('#requests>.collection');
    let li = document.createElement('li');
    li.className = "collection-item";
    li.id = "req_" + webid;
    li.innerHTML = `
    <div>
    ${webid}
        <div class="secondary-content">
            <button class="waves-effect waves-light btn-small btn-symbol green darken-2">
                <span class="material-symbols-outlined">
                    done
                </span>
            </button>
        </div>
    </div>
    <div class="progress hidden">
        <div class="indeterminate"></div>
    </div>
    `;

    let approve_button = li.querySelector("div>div>button");

    // TODO: check code flow for when button is pressed (approve/revoke/requestNotification) access
    approve_button.addEventListener('click', async (event) => {
        let button = event.currentTarget;
        let webid_frnd = event.currentTarget.parentElement.parentElement.parentElement.id.split("_")[1];

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
    });

    // add to dom
    requests_list.insertBefore(li, requests_list.firstChild);
}

async function removeRequestNotification(webid) {
    let li = document.getElementById("req_" + webid);
    if(li) {
        li.remove();
    }
}

async function updateRequestNotification(webid) {
    let li = document.getElementById("req_" + webid);

    if(li) {
        let approve_button = li.querySelector("div>div>button");
        if(approve_button && approve_button.classList.contains('green')) {
            // add X button
            // <button class="waves-effect waves-light btn-small btn-symbol green darken-2">
            //             <span class="material-symbols-outlined">
            //                 done
            //             </span>
            //         </button>
            
            approve_button.classList.add('red');
            approve_button.classList.remove('green');
            approve_button.firstElementChild.textContent = "close";
            approve_button.classList.remove("hidden");

            // remove loading bar
            let bar = li.querySelector(".progress");
            bar.classList.add("hidden");
        }        
    }
}

// TODO: make card show user info like name, img etc. and a status under it
// TODO: when click on card go to location on the map
function addFriendsCard(user) {
    let friends_list = document.getElementById('friends-list');

    if(friends_list && document.getElementById("card_" + user.webid) === null) {
        let li = document.createElement('li');
        li.id = "card_" + user.webid;
        li.className = "collection-item avatar";
        li.innerHTML =`
            <i class="material-symbols-outlined circle" style="font-size: 40px;">account_circle</i>
            <span class="title">${user.name}</span>
            <p>Awaiting approval</p>
            <div class="secondary-content collection-checkbox hidden">
                <label>
                    <input type="checkbox" class="filled-in" checked="" />
                    <span></span>
                </label>
            </div>
            <div class="progress">
                <div class="indeterminate"></div>
            </div>
        `;

        friends_list.insertBefore(li, friends_list.firstChild);

        let checkbox = li.querySelector("div>label>input");
        checkbox.webid = user.webid;
        checkbox.addEventListener('change', async (e) => {

            // get the friend user and create/remove the marker based on checked status
            const i = friendUsers.findIndex(f => f.webid == e.currentTarget.webid);
            if(i >= 0) {
                if(e.currentTarget.checked) {
                    friendUsers[i].showLocation = true;
                    let loc = friendUsers[i].locations.length > 0 ? friendUsers[i].locations[friendUsers[i].locations.length - 1] : null;
                    createMarkerFromUser(loc, friendUsers[i]);
                } else {
                    friendUsers[i].showLocation = false;
                    removeMarkerFromUser(friendUsers[i]);
                }
            }
        });
    }
}

function updateFriendsCard(user) {
    let friends_list = document.getElementById('friends-list');
    let li =  document.getElementById("card_" + user.webid);

    if(friends_list && li) {
        let checkbox_container = li.querySelector("div.collection-checkbox");
        if(checkbox_container && checkbox_container.classList.contains("hidden")) {
            // show checkbox
            checkbox_container.classList.remove("hidden");

            // remove loading bar
            let bar = li.querySelector(".progress");
            bar.classList.add("hidden");

            // edit text
            let p = li.querySelector("p");
            if(p) {

                if(user.hasAccess) {
                    p.innerText = "Shared location";
                } else {
                    p.innerText = "No access";
                }
            }
        }
    }
}

function removeFriendsCard(user) {
    let li = document.getElementById("card_" + user.webid);
    if(li) {
        li.remove();
    }
}

function setLoginMessage(text) {
    let login_message = document.getElementById('login-message');
    login_message.textContent = text;
    login_message.classList.remove("invisible");
}

function setLoginLoadingMessage(text) {
    let login_loading_message = document.getElementById("login-loading-message");
    login_loading_message.textContent = text;
}

function displayLoginLoadingScreen() {
    document.getElementById("login-loading").classList.remove("hidden");
    document.getElementById("login-content").classList.add("invisible");
}

function hideLoginLoadingScreen() {
    document.getElementById("login-loading").classList.add("hidden");
    document.getElementById("login-content").classList.remove("invisible");
}

function displayRequestLoading() {
    document.querySelector("#friends > div > div.progress").classList.remove("invisible");
}

function hideRequestLoading() {
    document.querySelector("#friends > div > div.progress").classList.add("invisible");
}

function setReqMessage(text) {
    let req_message = document.getElementById('req-message');
    req_message.textContent = text;
    req_message.classList.remove("hidden");
}

function hideLoginScreen() {
    document.getElementById('login').classList.add('hidden');
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

init();