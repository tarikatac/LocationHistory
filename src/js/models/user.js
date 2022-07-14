import { DateFormatter } from "./dateFormatter";

export class User {

    webid;
    oidcIssuer;
    storage;
    givenName;
    familyName;
    img;
    hasAccess = false;
    showLocation = true;
    statusMessage;
    isRemoved = false;

    // marker or route
    displayMode = 'marker';
    displayTimeFrom;
    displayTimeTo;

    // {
    //     lat,
    //     long,
    //     timestamp
    // }
    locations = [];

    constructor(webid) {
        this.webid = webid;

        // from beginning of today to end of today
        this.displayTimeFrom = new DateFormatter();
        this.displayTimeFrom.setHours(0, 0, 0);

        this.displayTimeTo = new DateFormatter();
        this.displayTimeTo.setHours(23, 59, 59);
        
    }

    // returns the name if exists else the webid
    get name() {
        if(this.givenName && this.familyName) {
            return this.givenName + " " + this.familyName;
        } else if (this.givenName) {
            return this.givenName;
        } else if (this.familyName) {
            return this.familyName;
        } else {
            return this.webid;
        }
    }

    getLatestLocation() {
        return this.locations.length > 0 ? this.locations[this.locations.length - 1] : null;
    }

    getLocations(t1, t2) {
        let locs = [];
        for(let l of this.locations) {
            if(t1 <= l.timestamp && l.timestamp <= t2) {
                locs.push(l);
            }
        }
        return locs;
    }

    // adds the locations in order of timestamp
    addLocations(locs) {
        this.locations = this.locations.concat(locs);
        this.locations.sort((a, b) => a.timestamp - b.timestamp);
    }

    isUsable() {
        return this.storage && this.oidcIssuer;
    }

    static CreateUserFromObject(object) {
        const user = new User(object.webid);
        for (var prop in object) {
            if (user.hasOwnProperty(prop)) {
                user[prop] = object[prop];
            }
        }
        return user;
    }
}