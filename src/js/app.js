// TODO: seperate css
import "./../scss/app.scss";

import {
    login,
    handleIncomingRedirect,
    getDefaultSession,
} from "@inrupt/solid-client-authn-browser";
import { fetch as solidfetch } from "@inrupt/solid-client-authn-browser";
import "leaflet";
import { LineUtil } from "leaflet";

import { createUserFromWebID } from "./services/webid";
import { loginUser, handleRedirectAfterLogin } from "./services/authenticate";
import { createInbox, givePublicAccesstotheInbox, giveAccessoftheContainertoOwner } from "./services/locationHistory";

const QueryEngine = require('@comunica/query-sparql').QueryEngine;

const map = L.map('map');
const marker = L.marker([0, 0]);
var locator;
let container;
let pod_url;

let posting_loc = false;
let login_button, post_location_button, req_frnd_button;
let currentUser;

async function init() {
    // initialize variables for DOM objects
    login_button = document.getElementById('webid-login');
    post_location_button = document.getElementById('start-posting');
    req_frnd_button = document.getElementById('req-frnd');

    addEventListeners();

    handleRedirect();

    initMap();
}

function addEventListeners() {
    login_button.addEventListener('click', async () => {

        setLoginLoadingMessage("Getting user info from webID...");
        displayLoginLoadingScreen();

        try {
            const webid = document.getElementById('webid').value;
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
        if(!posting_loc) {
            posting_loc = true;

            await GetCoordinates();

            //TODO: atm you need to start posting location to be able to recieve requests, maybe change this
            await fetchLocations();
            
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

        let webid_frnd = document.getElementById('friend-webid').value;
        let podUrl_frnd = await getStorageFromWebID(webid_frnd);

        addFriendsCard(webid_frnd);

        const file = `${podUrl_frnd}public/YourLocationHistory/inbox.ttl`;
        await sendNotifications(file);

    });

}

async function handleRedirect() {
    try {
        currentUser = await handleRedirectAfterLogin();

        if(currentUser === null)
            return;

        setLoginLoadingMessage("Creating inbox...");
        displayLoginLoadingScreen();
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

    hideLoginLoadingScreen();
    hideLoginScreen();
}

async function addRequestNotification(webid) {
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
    `;

    let approve_button = li.querySelector("div>div>button");

    approve_button.addEventListener('click', async (event) => {
        if(event.currentTarget.classList.contains("green")) {
            event.currentTarget.classList.add("hidden");

            //add loading bar
            let div = document.createElement("div");
            div.classList.add("progress");
            div.innerHTML = '<div class="indeterminate"></div>';
            event.currentTarget.parentElement.parentElement.parentElement.appendChild(div);

            await approvedSentNotification(webid);
            await addRequestingPersontoACL(webid);
        }
        else {
            await revokingPersonAccessfromACL(webid);
            await removeAccessNotification(webid);

            // remove notification
            removeRequestNotification(webid);
        }
    });

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
            if(bar) {
                bar.remove();
            }
        }        
    }
}

//TODO: in future pass something like a user object that has webid & more info like name and pic
async function addFriendsCard(webid) {
    let friends_list = document.getElementById('friends-list');

    if(friends_list && document.getElementById("card_" + webid) === null) {
        let li = document.createElement('li');
        li.id = "card_" + webid;
        li.className = "collection-item avatar";
        li.innerHTML =`
            <i class="material-symbols-outlined circle" style="font-size: 40px;">account_circle</i>
            <span class="title">${webid}</span>
            <p>Location not shared</p>
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
        checkbox.addEventListener('change', async (e) => {
            if(e.currentTarget.checked) {

            } else {

            }
        });
    }
}

async function updateFriendsCard(webid) {
    let friends_list = document.getElementById('friends-list');
    let li =  document.getElementById("card_" + webid);

    if(friends_list && li) {
        let checkbox_container = li.querySelector("div.collection-checkbox");
        if(checkbox_container && checkbox_container.classList.contains("hidden")) {
            // show checkbox
            checkbox_container.classList.remove("hidden");

            // remove loading bar
            let bar = li.querySelector(".progress");
            if(bar) {
                bar.remove();
            }

            // edit text
            let p = li.querySelector("p");
            if(p) {
                p.innerText = "Shared location";
            }
        }
    }
}

async function removeFriendsCard(webid) {
    let li = document.getElementById("card_" + webid);
    if(li) {
        li.remove();
    }
}

async function setLoginMessage(text) {
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

function setReqMessage(text) {
    let req_message = document.getElementById('req-message');
    req_message.textContent = text;
    req_message.classList.remove("invisible");
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

function initMap() {
    map.setView([0, 0], 3);
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tiles = L.tileLayer(tileURL, { attribution });
    tiles.addTo(map);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

init();




//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// async function Login(Issuer) {
//     if (Issuer) {
//         if (!getDefaultSession().info.isLoggedIn) {
//             await login({
//                 oidcIssuer: Issuer,
//                 redirectUrl: window.location.href,
//                 clientName: "LocationHistory"
//             });
//         }

//     }
//     //OIDC error message 
// }
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// async function handleRedirectAfterLogin() {
//     await handleIncomingRedirect();
//     if (getDefaultSession().info.isLoggedIn) {
//         await hideLoginScreen();
//         // document.getElementById('output').textContent = "Session logged in!";
//         await settingContainer();
//         await createInbox();
//         await giveAccessoftheContainertoOwner();
//     }
// }

// handleRedirectAfterLogin();
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function myfetchFunction(url) {
    return await solidfetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/sparql-update', 'Cache-Control': 'no-cache' },
        credentials: 'include'
    });
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// TODO: crashes if data cannot be queried from webid
// can not catch the error with try catch or .catch ???
async function getIssuerFromWebID(webid) {
    var myEngine_getIssuer = new QueryEngine();
    const bindingsStream = await myEngine_getIssuer.queryBindings(`
    SELECT ?o WHERE {
    ?s <http://www.w3.org/ns/solid/terms#oidcIssuer> ?o.
    }`, {
        sources: [`${webid}`],
    });

    const bindings = await bindingsStream.toArray();
    return (bindings[0].get('o').value);
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function getStorageFromWebID(webid) {
    var myEngine_getIssuer = new QueryEngine();
    const bindingsStream = await myEngine_getIssuer.queryBindings(`
  SELECT ?o WHERE {
   ?s <http://www.w3.org/ns/pim/space#storage> ?o.
  }`, {
        sources: [`${webid}`],
    });
    const bindings = await bindingsStream.toArray();
    return (bindings[0].get('o').value);
}

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function getDataFromWebID(webid) {
    var myEngine_getData = new QueryEngine();
    const bindingsStream = await myEngine_getData.queryBindings(`
  SELECT ?img ?familyName ?givenName WHERE {
  ?s <http://xmlns.com/foaf/0.1/img> ?img;
  <http://xmlns.com/foaf/0.1/familyName> ?familyName;
  <http://xmlns.com/foaf/0.1/givenName> ?givenName.
  }`, {
        sources: [`${webid}`],
    });
    const bindings = await bindingsStream.toArray();
    if (bindings.length == 0) { //When the foaf:givenName and foaf:FamilyName is absent webid will be shown
        return ([webid, '', ''])
    }
    else {
        return ([bindings[0].get('givenName').value, bindings[0].get('familyName').value, bindings[0].get('img').value]);
    }
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// async function settingContainer() {
//     switch (Object.keys(window.sessionStorage)[0]) {

//         case "webID_later":
//             pod_url = await getStorageFromWebID(window.sessionStorage.getItem('webID_later'));
//             container = pod_url + 'public/YourLocationHistory/Data/';
//             break;

//         case "oidcIssuer_later":
//             pod_url = await getStorageFromWebID(window.sessionStorage.getItem('webID_later'));
//             container = pod_url + 'public/YourLocationHistory/Data/';
//             break;
//     }
// }
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// async function GivePublicAccesstotheInbox() {
//     const file = container.split('Data')[0] + 'inbox.ttl';
//     const query = `<${pod_url}.acl#owner> a <http://www.w3.org/ns/auth/acl#Authorization>;
//     <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>,<http://www.w3.org/ns/auth/acl#Write>, <http://www.w3.org/ns/auth/acl#Control>;
//     <http://www.w3.org/ns/auth/acl#accessTo> <${file}>;
//     <http://www.w3.org/ns/auth/acl#default> <${file}>;
//     <http://www.w3.org/ns/auth/acl#agentClass> <http://xmlns.com/foaf/0.1/Agent>.`
//     // Send a PUT request to inbox.ttl.acl
//     const response = await solidfetch(file + '.acl', {
//         method: 'PUT',
//         headers: { 'Content-Type': 'text/turtle' },
//         body: query,
//         credentials: 'include'
//     });
// }
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// async function createInbox() {
//     const file = container.split('Data')[0] + 'inbox.ttl';
//     // Send a GET request to check if inbox exists
//     const response_ = await solidfetch(file, {
//         method: 'GET',
//         headers: { 'Content-Type': 'text/turtle' },
//         credentials: 'include'
//     });

//     if (300 < response_.status && response_.status < 500) {
//         const query = ``
//         // Send a PUT request to add inbox
//         const response = await solidfetch(file, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'text/turtle' },
//             body: query,
//             credentials: 'include'
//         });
//         await GivePublicAccesstotheInbox();
//     }
// }
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function sendNotifications(file_frnd) {
    //Storing all participant pod urls in my solid comunity pod.
    const query = `INSERT DATA {<> <http://tobeadded.com/LocationRequestedBy> <${window.sessionStorage.getItem('webID_later')}>.}`;
    // Send a PATCH request the pod url to inbox.ttl 
    const response = await fetch(file_frnd, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: query
    });
    if (300 < response.status && response.status < 600) {
        setReqMessage("Your friend may not have used our app yet!");
        console.log(` Error code is ${response.status} Your friend may not have used our app yet!`);
    }
}
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function sendRequestAcceptedNotification(rqstr_webid) {
    const rqstr_issuer = await getStorageFromWebID(rqstr_webid);
    const query = `INSERT DATA {<${window.sessionStorage.getItem('webID_later')}> <http://tobeadded.com/GrantedAccessToLocation> <${container}>.}`;
    // Send a PATCH request the pod url to inbox.ttl 
    const response = await fetch(rqstr_issuer + 'public/YourLocationHistory/inbox.ttl', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: query
    });
    if (300 < response.status && response.status < 600) {
        console.log(` HTTP fetch Error code is ${response.status} Your friend may not have used our app yet!`)
    }
}
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let response_data;
async function addRequestingPersontoACL(webid_rqstr) {

    const query_extra = `:Read
        a acl:Authorization;
        acl:accessTo D:;
        acl:agent <${webid_rqstr}>;
        acl:default D:;
        acl:mode acl:Read.`;
    // Send a GET and PUT request to update the source
    const response = await solidfetch(container + '.acl', {
        method: 'GET',
        headers: { 'Content-Type': 'text/turtle' },
    }).then(response_ => response_.text()).then(async (data) => {
        response_data = data; if (!response_data.includes(query_extra)) {
            const query = response_data + "\n" + query_extra;
            const response_put = await solidfetch(container + '.acl', {
                method: 'PUT',
                headers: { 'Content-Type': 'text/turtle' },
                body: query
            });
        }
    });
    await sendRequestAcceptedNotification(webid_rqstr);
}
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var myEngine_getNots = new QueryEngine();
let rqstr_webid_array = new Array();
async function getRequestNotifications() {
    const file = container.split('Data')[0] + 'inbox.ttl';
    const bindingsStream = await myEngine_getNots.queryBindings(`
  SELECT ?o WHERE {
   ?s <http://tobeadded.com/LocationRequestedBy> ?o.
  }`, {
        sources: [`${file}`],
        fetch: myfetchFunction,
    });
    myEngine_getNots.invalidateHttpCache();
    const bindings = await bindingsStream.toArray();
    bindings.forEach(element => {
        let rqstr_webid = element.get('o').value;
        if (document.getElementById("req_" + rqstr_webid) == null) {

            addRequestNotification(rqstr_webid);            

            rqstr_webid_array.push(rqstr_webid)
        }
        
    });
    const bindingsStream_ = await myEngine_getNots.queryBindings(`
  SELECT ?o WHERE {
   ?s <http://tobeadded.com/YouGrantedAccessTo> ?o.
  }`, {
        sources: [`${file}`],
        fetch: myfetchFunction,
    });
    myEngine_getNots.invalidateHttpCache();
    const bindings_ = await bindingsStream_.toArray();
    bindings_.forEach((element) => {
        let rqstr_webid = element.get('o').value;
        updateRequestNotification(rqstr_webid);
    });
}
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function revokingPersonAccessfromACL(rvk_aprvd_webid) {
    const query_extra = `:Read
        a acl:Authorization;
        acl:accessTo D:;
        acl:agent <${rvk_aprvd_webid}>;
        acl:default D:;
        acl:mode acl:Read.`;
    // Send a GET and PUT request to update the source
    const response = await solidfetch(container + '.acl', {
        method: 'GET',
        headers: { 'Content-Type': 'text/turtle' },
    }).then(response_ => response_.text()).then(async (data) => {
        response_data = data;
        if (response_data.includes(query_extra)) {
            const query = response_data.split(query_extra).join('\n');
            const response_put = await solidfetch(container + '.acl', {
                method: 'PUT',
                headers: { 'Content-Type': 'text/turtle' },
                body: query
            });
        }
    });
    await deleteRequestAcceptedNotification(rvk_aprvd_webid);
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function deleteRequestAcceptedNotification(rqstr_webid) {
    const rqstr_issuer = await getStorageFromWebID(rqstr_webid);
    const query = `DELETE DATA {<${window.sessionStorage.getItem('webID_later')}> <http://tobeadded.com/GrantedAccessToLocation> <${container}>.}`;
    // Send a PATCH request the pod url to inbox.ttl 
    const response = await fetch(rqstr_issuer + 'public/YourLocationHistory/inbox.ttl', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: query
    });
    if (300 < response.status && response.status < 600) {
        console.log(` HTTP fetch Error code is ${response.status}`);
    }
}
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function approvedSentNotification(apprvd_rqstr_webid) {
    const query = `DELETE DATA {<> <http://tobeadded.com/LocationRequestedBy> <${apprvd_rqstr_webid}>.}`;
    // Send a PATCH request the pod url to names.ttl 
    const response = await fetch(container.split("/Data/")[0] + "/inbox.ttl", {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: query
    });
    if (300 < response.status && response.status < 600) {
        console.log("Your friend has not used our app yet or the entry could not be deleted!")
    }
    else {
        const query = `INSERT DATA {<> <http://tobeadded.com/YouGrantedAccessTo> <${apprvd_rqstr_webid}>.}`;
        // Send a PATCH request the pod url to names.ttl 
        const response = await fetch(container.split("/Data/")[0] + "/inbox.ttl", {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/sparql-update' },
            body: query
        });
        if (300 < response.status && response.status < 600) {
            console.log("Your friend has not used our app yet or the entry could not be deleted!")
        }
    }
}
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function removeAccessNotification(rm_rqstr_webid) {
    const query = `DELETE DATA {<> <http://tobeadded.com/YouGrantedAccessTo> <${rm_rqstr_webid}>.}`;
    // Send a PATCH request the pod url to names.ttl 
    const response = await fetch(container.split("/Data/")[0] + "/inbox.ttl", {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: query
    });
    if (300 < response.status && response.status < 600) {
        console.log("Your friend has not used our app yet or the entry could not be deleted!")
    }
}
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var myEngine_getURLs = new QueryEngine();
async function getAccessGrantedNotifications() {
    let lctn_container = new Array();
    let acptr_webid = new Array();
    const file = container.split('Data')[0] + 'inbox.ttl';
    const bindingsStream = await myEngine_getURLs.queryBindings(`
    SELECT ?acptr_webid ?lctn_container WHERE {
           ?acptr_webid  <http://tobeadded.com/GrantedAccessToLocation> ?lctn_container.
    }`, {
        sources: [`${file}`],
        fetch: myfetchFunction,
    });
    myEngine_getURLs.invalidateHttpCache();
    const bindings = await bindingsStream.toArray();
    bindings.forEach((element1, element2) => { acptr_webid.push(element1.get('acptr_webid').value), lctn_container.push(element1.get('lctn_container').value) });
    return { acptr_webid, lctn_container };
}
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function fetchWebid_Container(acptr_webid, lctn_container) {
    acptr_webid.forEach(async (element1, index) => {
        const element2 = lctn_container[index];
        await getLatLongofFriend(element1, element2);
    });
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function fetchLocations() {
    window.setInterval(
        async () => {
            await getRequestNotifications();
            const { acptr_webid, lctn_container } = await getAccessGrantedNotifications();
            await fetchWebid_Container(acptr_webid, lctn_container);
        }, 5000);
}
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function GetCoordinates() {
    var optn = {
        enableHighAccuracy: true,
        timeout: Infinity,
        maximumAge: 0
    };
    if (navigator.geolocation) {
        locator = navigator.geolocation.watchPosition(async function (position) {

            addPostedLocationHistory(position.coords.latitude, position.coords.longitude, position.timestamp);

            marker.setLatLng([position.coords.latitude, position.coords.longitude]);

            const query = `@prefix sosa: <http://www.w3.org/ns/sosa/>.
        @prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>.
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
        @prefix plh: <https://w3id.org/personallocationhistory#> .
        @prefix tm: <https://w3id.org/transportmode#> .
        @prefix geo: <http://www.opengis.net/ont/geosparql#>.
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.

        <${navigator.platform.split(" ").join('')}> a sosa:Platform;
        sosa:hosts <locationSensor>.

        <locationSensor> a sosa:Sensor;
        sosa:madeObservation <>;
        sosa:observes <location>;
        sosa:isHostedBy <${navigator.platform.split(" ").join('')}>.

        <> a sosa:Observation;
        sosa:observedProperty <location> ;
        sosa:hasResult <_result>;
        sosa:featureOfInterest <${window.sessionStorage.getItem('webID_later')}> ;
        sosa:hasSimpleResult "POINT(${position.coords.longitude} ${position.coords.latitude})"^^geo:wktLiteral ;
        sosa:madeBySensor <locationSensor>;
        sosa:resultTime "${new Date(Number(position.timestamp)).toISOString()}"^^xsd:dateTime.

        <_result> a sosa:Result;
        wgs84:long ${position.coords.longitude};
        wgs84:lat ${position.coords.latitude}.

        <location> a sosa:ObservableProperty;
        rdfs:label "Location"@en .

        <${window.sessionStorage.getItem('webID_later')}> a sosa:FeatureOfInterest.        `
            // const query = `<> <https://schema.org/latitude> "${position.coords.latitude}";<https://schema.org/longitude> "${position.coords.longitude}";<http://purl.org/dc/terms/created> "${position.timestamp}".`

            // Send a PUT request to post to the source
            const response = await solidfetch(container + `${position.timestamp}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/turtle' },
                body: query,
                credentials: 'include'
            });

        }, async function error() {
            document.querySelector('#status').textContent = 'Unable to retrieve your location';
        }, optn);
    }
};
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function test(friend_container) {
    var myEngine = new QueryEngine();
    // Fetch the latest timestamp  
    let bindingsStream;
    try {
        bindingsStream = await myEngine.queryBindings(`
        SELECT (STRAFTER(?fileName, "/YourLocationHistory/Data/") AS ?tmstmp) 
        WHERE {
          ?s <http://www.w3.org/ns/ldp#contains> ?name .
          BIND (STR(?name) AS ?fileName)
        }
        ORDER BY DESC(?tmstmp)`, {
            sources: [`${friend_container}`],
            fetch: myfetchFunction,
            httpIncludeCredentials: true
        });
        myEngine.invalidateHttpCache();


        // Consume results as an array (easier)
        const bindings = await bindingsStream.toArray();
        const tmstmp = bindings[0].get('tmstmp').value;
        //---------------------------------------------------------------------------------------
        //Fetch the lat-long from the file corresponding to the latest timestamp
        const bindingsStream_1 = await myEngine.queryBindings(`
      SELECT ?lat ?long WHERE {
      ?s <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat ;
         <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long
      }`, {
            sources: [`${friend_container}${bindings[0].get('tmstmp').value}`],
            fetch: myfetchFunction,
            httpIncludeCredentials: true
        });

        const bindings_1 = await bindingsStream_1.toArray();

        //Return the latest Latitude and Longitude:
        const lat_long_list = [bindings_1[0].get('lat').value, bindings_1[0].get('long').value];
        let loc_array = [lat_long_list, tmstmp]
        return (loc_array);
    } catch (error) {
        //Once the friend revoke's access to the location data container, The Lat Long fetch will stop this is to try catch that
        // console.log("This is the error",error);//All actors rejected their test in urn:comunica:default:rdf-join/mediators#main
        // console.log("This is the error on container:",friend_container);
    }
}
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//Variables for open-street Map
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const tiles = L.tileLayer(tileURL, { attribution });
tiles.addTo(map);
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
async function getLatLongofFriend(friend_webid, friend_container) {
    let data_array = await getDataFromWebID(friend_webid);
    const loc_array = await test(friend_container);
    const lat_long_list = loc_array[0];
    const tmstmp_ = loc_array[1];
    if (lat_long_list) {
        map.eachLayer(function (layer) {
            if (layer._content) {
                if (layer._content.split('\r\n')[0] == data_array[0] + ` ${data_array[1]}`) {
                    // console.log(`removing _tooltip: ${layer}`);
                    map.removeLayer(layer);
                }
            }
            if (layer._tooltipHandlersAdded) {
                if (layer._tooltip._content.split('\r\n')[0] == data_array[0] + ` ${data_array[1]}`) {
                    // console.log(`removing marker: ${layer}`);
                    map.removeLayer(layer);
                }
            }
        });
        let friendMarker;
        if (data_array[2] == '') {//If the user doesn't have the foaf:img triple
            friendMarker = L.marker(lat_long_list);
        }
        else {
            var friend_image = L.icon({
                iconUrl: data_array[2],
                iconSize: [30, 30], // size of the icon
                iconAnchor: [15, 15] // point of the icon which will correspond to marker's location
            });
            friendMarker = L.marker(lat_long_list, { icon: friend_image });
        }
        friendMarker.addTo(map);
        friendMarker._icon.classList.add("huechange");
        friendMarker.bindTooltip(data_array[0] + ` ${data_array[1]}` + `\r\n Last seen at ${new Date(Number(tmstmp_)).toLocaleString()}`).openTooltip();

        updateFriendsCard(friend_webid);
    }
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// async function giveAccessoftheContainertoOwner() {
//     const response = await solidfetch(container + '.acl', {
//         method: 'GET',
//         headers: { 'Content-Type': 'text/turtle' },
//     });
//     if (response.status > 300) {
//         const query = `@prefix : <#>.
//       @prefix acl: <http://www.w3.org/ns/auth/acl#>.
//       @prefix foaf: <http://xmlns.com/foaf/0.1/>.
//       @prefix D: <./>.
      

//       :ReadControlWrite
//       a acl:Authorization;
//       acl:accessTo D:;
//       acl:agent <${window.sessionStorage.getItem('webID_later')}>;
//       acl:default D:;
//       acl:mode acl:Control, acl:Read, acl:Write.`
//         // Send a PUT request to post to the source
//         const response = await solidfetch(container + '.acl', {
//             method: 'PUT',
//             headers: { 'Content-Type': 'text/turtle' },
//             body: query,
//             credentials: 'include'
//         });
//     }
// }
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


