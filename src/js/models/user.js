export class User {

    webid;
    oidcIssuer;
    storage;
    givenName;
    familyName;
    img;
    hasAccess = false;

    // {
    //     lat,
    //     long,
    //     timestamp
    // }
    locations = [];

    constructor(webid) {
        this.webid = webid;
        
    }
}