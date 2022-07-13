export class User {

    webid;
    oidcIssuer;
    storage;
    givenName;
    familyName;
    img;
    hasAccess = false;
    showLocation = true;

    // {
    //     lat,
    //     long,
    //     timestamp
    // }
    locations = [];

    constructor(webid) {
        this.webid = webid;
        
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

    isUsable() {
        return this.storage && this.oidcIssuer;
    }
}