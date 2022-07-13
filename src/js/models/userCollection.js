class UserCollection {
    
    #users;
    
    constructor() {
        this.#users = new Array();
    }

    get(webid) {
        return this.#users.find(u => u.webid == webid);
    }

    push(user) {
        this.#users.push(user);
    }

    // returns false if the user does not exists / returns true when succesfull set
    set(user) {
        const i = this.#users.findIndex(u => u.webid == webid);

        if(i < 0)
            return false;

        this.#users[i] = user;

        return true;
    }

    exists(webid) {
        if(!webid)
            return false;
        
        return this.#users.findIndex(u => u.webid == webid) >= 0;
    }
}