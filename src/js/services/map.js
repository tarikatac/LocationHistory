import "leaflet";

import { User } from "../models/user";

let map;

// hashmap webid => marker
let markers = new Map();

export function initMap() {
    map = L.map('map');
    map.setView([0, 0], 3);
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tiles = L.tileLayer(tileURL, { attribution });
    tiles.addTo(map);
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