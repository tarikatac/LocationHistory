import "leaflet";

import { User } from "../models/user";
import { DateFormatter } from "../models/dateFormatter";

let map;

let markerSelf;

// hashmap webid => marker
let markers = new Map();

// webid => array of polylines
let routes = new Map();

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
        // check if marker already exists
        if(markers.get(user.webid)) {
            markers.get(user.webid).setLatLng([loc.lat, loc.long]);
            markers.get(user.webid).setTooltipContent(`${user.name} Last seen at ${new Date(Number(loc.timestamp)).toLocaleString()}`);
        } else {
            let friendMarker;
            if (!user.img) {//If the user doesn't have the foaf:img triple
                friendMarker = L.marker([loc.lat, loc.long]);
            }
            else {
                let friend_image = L.icon({
                    iconUrl: user.img,
                    iconSize: [30, 30], // size of the icon
                    iconAnchor: [15, 15] // point of the icon which will correspond to marker's location
                });
                friendMarker = L.marker([loc.lat, loc.long], { icon: friend_image });
                friendMarker._icon.classList.add("huechange");
            }

            let tooltip = `${user.name} Last seen at ${new Date(Number(loc.timestamp)).toLocaleString()}`;
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

    routes.set(user.webid, new Array());

    //create polyline for each transport mode part

    let prevTransportMode;
    let prevLoc;
    let numberOfPolylines = 0;
    let latlngs = [];
    let startTimeSegment;
    for(let loc of user.locations) {
        if(t1.getTime() <= loc.timestamp && loc.timestamp <= t2.getTime()) {
            if(!startTimeSegment)
                startTimeSegment = (new DateFormatter(Number(loc.timestamp))).getFormattedTime();

            if(!prevTransportMode || prevTransportMode == loc.transportMode) {
                latlngs.push([loc.lat, loc.long]);
            } else {
                let polyline = L.polyline(latlngs, {color: colors[prevTransportMode] ? colors[prevTransportMode] : '#2196F3'});
                let tooltip = `${user.name} | ${prevLoc.transportMode} | ${startTimeSegment} > ${(new DateFormatter(Number(prevLoc.timestamp))).getFormattedTime()}`;

                polyline.bindTooltip(tooltip).openTooltip();
                routes.get(user.webid).push(polyline.addTo(map));

                latlngs = [[prevLoc.lat, prevLoc.long]];
                startTimeSegment = (new DateFormatter(Number(prevLoc.timestamp))).getFormattedTime();

                latlngs.push([loc.lat, loc.long]);
            }
            prevTransportMode = loc.transportMode;
            prevLoc = loc;          
        }
    }
    let polyline = L.polyline(latlngs, {color: colors[prevTransportMode] ? colors[prevTransportMode] : '#2196F3'});
    let tooltip = `${user.name} | ${prevLoc.transportMode} | ${startTimeSegment} > ${(new DateFormatter(Number(prevLoc.timestamp))).getFormattedTime()}`;
    polyline.bindTooltip(tooltip).openTooltip();
    routes.get(user.webid).push(polyline.addTo(map));
    
    return latlngs.length > 0 ? latlngs[latlngs.length -1] : null;
}

export function removeRouteFromUser(user) {
    if(!user)
        return;

    let rs = routes.get(user.webid);
    if(rs) {
        for(let polyline of rs) {
            map.removeLayer(polyline);
        }
        routes.delete(user.webid);
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