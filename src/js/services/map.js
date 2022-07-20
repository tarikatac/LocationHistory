import "leaflet";

import { User } from "../models/user";
import { DateFormatter } from "../models/dateFormatter";

let map;

let markerSelf;

// hashmap webid => marker
let markers = new Map();

// webid => array of polylines
let routes = new Map();

let routeMarkers = new Map();

const colors = {
    walking: '#4CAF50',
    bicycle: '#ff9800',
    car: '#F44336'
}

export function initMap() {
    map = L.map('map');
    map.setView([0, 0], 3);
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tiles = L.tileLayer(tileURL, { attribution });
    tiles.addTo(map);

    // create legend
    let legend = L.control({position: 'bottomleft'});
    legend.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'map-legend');

        div.innerHTML = `
            <strong>Transport mode</strong><br>
            <i class='line green'></i> Walking<br>
            <i class='line orange'></i> Bicycle<br>
            <i class='line red'></i> Car<br>
            <i class='line blue'></i> Other<br>
        `;

        return div;
    };
    legend.addTo(map);
}

export function createMarkerFromUser(loc, user) {
    if(loc && user) {
        let tooltip = `${user.name} | ${loc.transportMode ? loc.transportMode : 'other'} | Last seen at ${new Date(Number(loc.timestamp)).toLocaleString()}`;
        // check if marker already exists
        if(markers.get(user.webid)) {
            markers.get(user.webid).setLatLng([loc.lat, loc.long]);
            markers.get(user.webid).setTooltipContent(tooltip);
        } else {
            let friendMarker;
            if (!user.img) {//If the user doesn't have the foaf:img triple
                friendMarker = L.marker([loc.lat, loc.long]);
            }
            else {
                let friend_image = L.divIcon({className: 'dummy', html: `<div class="friend-marker"><img src="${user.img}"></img></div>`});
                friendMarker = L.marker([loc.lat, loc.long], { icon: friend_image });
            }

            friendMarker.bindTooltip(tooltip).openTooltip();

            markers.set(user.webid, friendMarker.addTo(map));
        }
    }
}

//checks the users webid and removes this marker from the array and map with the same webid
export function removeMarkerFromUser(user) {
    if(!user)
        return;

    if(markers.get(user.webid)) {
        map.removeLayer(markers.get(user.webid));
        markers.delete(user.webid);
    }
}

export function moveMap(loc, zoom) {
    map.setView([loc.lat, loc.long], zoom);
}

// returns the last point of the route
export function createRouteFromUser(user, t1, t2) {
    if(!user)
        return;

    // map of user.webid => (map of routes with key 't1-t2')
    if(!routes.has(user.webid))
        routes.set(user.webid, new Map());

    //create polyline for each transport mode part

    let prevTransportMode;
    let prevLoc;
    let numberOfPolylines = 0;
    let latlngs = [];
    let startTimeSegment;
    for(let loc of user.locations) {
        if(t1.getTime() <= loc.timestamp && loc.timestamp <= t2.getTime()) {
            if(!startTimeSegment)
                startTimeSegment = loc.timestamp;

            if(!prevTransportMode || prevTransportMode == loc.transportMode) {
                latlngs.push([loc.lat, loc.long]);
            } else {
                
                // only create the polyline if it does not yet exist
                if(!routes.get(user.webid).has(`${startTimeSegment}-${prevLoc.timestamp}`)) {
                    let polyline = L.polyline(latlngs, {color: colors[prevTransportMode] ? colors[prevTransportMode] : '#2196F3'});
                    let tooltip = `${user.name} | ${prevLoc.transportMode ? prevLoc.transportMode : 'other'} | ${ new Date(Number(startTimeSegment)).toLocaleString()} > ${new Date(Number(prevLoc.timestamp)).toLocaleString()}`;
                    polyline.bindTooltip(tooltip).openTooltip();

                    routes.get(user.webid).set(`${startTimeSegment}-${prevLoc.timestamp}`, polyline.addTo(map));
                }

                latlngs = [[prevLoc.lat, prevLoc.long]];
                startTimeSegment = loc.timestamp;

                latlngs.push([loc.lat, loc.long]);
            }
            prevTransportMode = loc.transportMode;
            prevLoc = loc;          
        }
    }

    if(startTimeSegment) {
        // only create the polyline if it does not yet exist
        if(!routes.get(user.webid).has(`${startTimeSegment}-${prevLoc.timestamp}`)) {
            let polyline = L.polyline(latlngs, {color: colors[prevTransportMode] ? colors[prevTransportMode] : '#2196F3'});
            let tooltip = `${user.name} | ${prevLoc.transportMode ? prevLoc.transportMode : 'other'} | ${ new Date(Number(startTimeSegment)).toLocaleString()} > ${new Date(Number(prevLoc.timestamp)).toLocaleString()}`;
            polyline.bindTooltip(tooltip).openTooltip();

            routes.get(user.webid).set(`${startTimeSegment}-${prevLoc.timestamp}` ,polyline.addTo(map));
        }

        // check if marker already exist
        let tooltipMarker = `${user.name} | ${prevLoc.transportMode ? prevLoc.transportMode : 'other'} | Last seen at ${new Date(Number(prevLoc.timestamp)).toLocaleString()}`;
        if(routeMarkers.get(user.webid)) {
            // update marker
            routeMarkers.get(user.webid).setLatLng([prevLoc.lat, prevLoc.long]);
            routeMarkers.get(user.webid).setTooltipContent(tooltipMarker);
        } else {
            //create new marker
            let m;
            if (!user.img) {//If the user doesn't have the foaf:img triple
                m = L.marker([prevLoc.lat, prevLoc.long]);
            }
            else {
                let friend_image = L.divIcon({className: 'dummy', html: `<div class="friend-marker"><img src="${user.img}"></img></div>`});
                m = L.marker([prevLoc.lat, prevLoc.long], { icon: friend_image });
            }
            m.bindTooltip(tooltipMarker).openTooltip();

            routeMarkers.set(user.webid, m.addTo(map));
        }

        return prevLoc;
    }
    
    return null;
}

export function removeRouteFromUser(user) {
    if(!user)
        return;

    if(routes.has(user.webid)) {
        for(const [key, value] of routes.get(user.webid)) {
            map.removeLayer(value);
        }
        routes.delete(user.webid);
    }

    if(routeMarkers.get(user.webid)) {
        map.removeLayer(routeMarkers.get(user.webid));
        routeMarkers.delete(user.webid);
    }
}

export function createMarkerSelf(lat, long) {
    if(markerSelf) {
        // update
        markerSelf.setLatLng([lat, long]);
    } else {
        // create
        let myIcon = L.divIcon({className: 'dummy', html: '<div class="marker-self"><div></div></div>'});
        markerSelf = L.marker([lat, long], {icon: myIcon}).addTo(map);
        moveMap({lat: lat, long: long}, 12);
    }
}

export function removeMarkerSelf() {
    if(markerSelf) {
        map.removeLayer(markerSelf);
        markerSelf = null;
    }
}