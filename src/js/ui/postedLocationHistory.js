import { moveMap } from "../services/map";
import { DateFormatter } from "../models/dateFormatter";

export function initPostedLocationHistory() {
    let container = document.getElementById("posted-locations-container");
    container.addEventListener('click', (e) => {

        // search for the a element to retrieve lat long
        let a = e.target;
        let i = 3;
        while(a && a.tagName != 'A' && i >= 0) {
            a = a.parentElement;
            i--;
        }

        if(!a || a.tagName != 'A') {
            return;
        }

        if(a.dataset.lat && a.dataset.long) {
            moveMap({lat: a.dataset.lat, long: a.dataset.long}, 12);
        }
    });

    document.getElementById("show-my-locations").addEventListener("click", () => {
        let container = document.getElementById("posted-locations");
        if(container.hasChildNodes()) {
            if(container.classList.contains('hidden')) {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }
    });
}

export function addPostedLocationHistory(lat, long, timestamp) {
    let date = new DateFormatter(timestamp);

    let collection = document.getElementById('posted-locations');
    let a = document.createElement('a');
    a.className = "collection-item location-item";
    a.innerHTML = `
    <div>
        ${date.getFormattedDate()}<br>${date.getFormattedTime(true)}
    </div>
    <div>
        ${Number.parseFloat(lat).toFixed(5)}<br>${Number.parseFloat(long).toFixed(5)}
    </div>
    `;
    a.dataset.lat = lat;
    a.dataset.long = long;

    collection.insertBefore(a, collection.firstChild);
}