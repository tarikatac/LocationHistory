import "leaflet";

let map;

export function initMap() {
    map = L.map('map');
    map.setView([0, 0], 3);
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tiles = L.tileLayer(tileURL, { attribution });
    tiles.addTo(map);
}

// TODO: rewrite this function / seperate functionality for reusability
export function createMarkerFromUser(loc, user) {
    if(loc && user) {
        map.eachLayer(function (layer) {
            if (layer._content) {
                if (layer._content.split('\r\n')[0] == user.givenName + ` ${user.familyName}`) {
                    // console.log(`removing _tooltip: ${layer}`);
                    map.removeLayer(layer);
                }
            }
            if (layer._tooltipHandlersAdded) {
                if (layer._tooltip._content.split('\r\n')[0] == user.givenName + ` ${user.familyName}`) {
                    // console.log(`removing marker: ${layer}`);
                    map.removeLayer(layer);
                }
            }
        });
        let friendMarker;
        if (!user.img) {//If the user doesn't have the foaf:img triple
            friendMarker = L.marker([loc.lat, loc.long]);
        }
        else {
            var friend_image = L.icon({
                iconUrl: user.img,
                iconSize: [30, 30], // size of the icon
                iconAnchor: [15, 15] // point of the icon which will correspond to marker's location
            });
            friendMarker = L.marker([loc.lat, loc.long], { icon: friend_image });
        }
        console.log(friendMarker);
        friendMarker.addTo(map);
        friendMarker._icon.classList.add("huechange");

        if(user.givenName || user.familyName) {
            friendMarker.bindTooltip(user.givenName + ` ${user.familyName}` + `\r\n Last seen at ${new Date(Number(loc.timestamp)).toLocaleString()}`).openTooltip();
        } else {
            friendMarker.bindTooltip(` ${user.webid}` + `\r\n Last seen at ${new Date(Number(loc.timestamp)).toLocaleString()}`).openTooltip();
        }
    }
}