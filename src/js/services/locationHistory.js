//TODO: add location history logic here
import { fetch as solidfetch } from "@inrupt/solid-client-authn-browser";

// query engine gives error when invalid source is used. fix:
window.setImmediate = window.setTimeout;

const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const myEngine = new QueryEngine();

const storage_path = 'public/YourLocationHistory/';
const container_path = storage_path + 'Data/';
const inbox_file = storage_path + 'inbox.ttl';

async function myfetchFunction(url) {
    return await solidfetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/sparql-update', 'Cache-Control': 'no-cache' },
        credentials: 'include'
    });
}

export async function createInbox(user_storage) {
    const file = user_storage + inbox_file;

    let response_;
    try {
        // Send a GET request to check if inbox exists
        response_ = await solidfetch(file, {
            method: 'GET',
            headers: { 'Content-Type': 'text/turtle' },
            credentials: 'include'
        });

    } catch (error) {
        throw new Error("Error trying to fetch inbox.ttl");
    }

    if (300 < response_.status && response_.status < 500) {
        let response;
        try {
            const query = ``
            // Send a PUT request to add inbox
            response = await solidfetch(file, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/turtle' },
                body: query,
                credentials: 'include'
            });
        } catch (error) {
            throw new Error("Error trying to fetch inbox.ttl");
        }

        if (response.status >= 400) {
            throw new Error("Could not create inbox.ttl");
        }
    }
}

export async function givePublicAccesstotheInbox(user_storage) {
    const file = user_storage + inbox_file;
    const query = `<${user_storage}.acl#owner> a <http://www.w3.org/ns/auth/acl#Authorization>;
    <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>,<http://www.w3.org/ns/auth/acl#Write>, <http://www.w3.org/ns/auth/acl#Control>;
    <http://www.w3.org/ns/auth/acl#accessTo> <${file}>;
    <http://www.w3.org/ns/auth/acl#default> <${file}>;
    <http://www.w3.org/ns/auth/acl#agentClass> <http://xmlns.com/foaf/0.1/Agent>.`
    // Send a PUT request to inbox.ttl.acl

    let response;
    try {
        response = await solidfetch(file + '.acl', {
            method: 'PUT',
            headers: { 'Content-Type': 'text/turtle' },
            body: query,
            credentials: 'include'
        });
    } catch (error) {
        throw new Error("Could not set public access to inbox");
    }

    if (response.status >= 400) {
        throw new Error("Could not set public access to inbox");
    }
}

export async function giveAccessoftheContainertoOwner(webID, storage) {
    const container = storage + container_path;
    console.log(container);
    let response_;
    try {
        response_ = await solidfetch(container + '.acl', {
            method: 'GET',
            headers: { 'Content-Type': 'text/turtle' },
        });
    } catch (error) {
        throw new Error("Could not give access of the container to owner");
    }


    if (response_.status > 300) {
        const query = `@prefix : <#>.
        @prefix acl: <http://www.w3.org/ns/auth/acl#>.
        @prefix foaf: <http://xmlns.com/foaf/0.1/>.
        @prefix D: <./>.
        

        :ReadControlWrite
        a acl:Authorization;
        acl:accessTo D:;
        acl:agent <${webID}>;
        acl:default D:;
        acl:mode acl:Control, acl:Read, acl:Write.`

        let response;
        try {
            // Send a PUT request to post to the source
            response = await solidfetch(container + '.acl', {
                method: 'PUT',
                headers: { 'Content-Type': 'text/turtle' },
                body: query,
                credentials: 'include'
            });
        } catch (error) {
            throw new Error("Could not give access of the container to owner");
        }

        if (response.status >= 400) {
            throw new Error("Could not give access of the container to owner");
        }
    }
}

export async function sendNotification(webidCurrentUser, storageFriend) {
    const file_frnd = storageFriend + inbox_file;

    let response;
    try {
        //Storing all participant pod urls in my solid comunity pod.
        const query = `INSERT DATA {<> <http://tobeadded.com/LocationRequestedBy> <${webidCurrentUser}>.}`;
        // Send a PATCH request the pod url to inbox.ttl 
        response = await fetch(file_frnd, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/sparql-update' },
            body: query
        });
    } catch(error) {
        throw new Error("Your friend may not have used our app yet!");
    }

    if (300 < response.status && response.status < 600) {
        throw new Error(` Error code is ${response.status} Your friend may not have used our app yet!`);
    }
}

// returns a "hashmap" (aka object with props in js) of all requests
// webid => boolean
// boolean if you granted access
export async function getRequestNotifications(storage) {
    let requests = {};

    const file = storage + inbox_file;

    const bindingsStream = await myEngine.queryBindings(`
        SELECT ?o WHERE {
        ?s <http://tobeadded.com/LocationRequestedBy> ?o.
        }`, {
        sources: [`${file}`],
        fetch: myfetchFunction,
    });

    myEngine.invalidateHttpCache();
    const bindings = await bindingsStream.toArray();
    bindings.forEach(element => {
        let rqstr_webid = element.get('o').value;

        requests[rqstr_webid] = false;

    });
    const bindingsStream_ = await myEngine.queryBindings(`
        SELECT ?o WHERE {
        ?s <http://tobeadded.com/YouGrantedAccessTo> ?o.
        }`, {
        sources: [`${file}`],
        fetch: myfetchFunction,
    });
    myEngine.invalidateHttpCache();

    const bindings_ = await bindingsStream_.toArray();
    bindings_.forEach((element) => {
        let rqstr_webid = element.get('o').value;
        requests[rqstr_webid] = true;
    });

    return requests;
}

// TODO: better error handling for funcs below here
export async function approveAccess(webid, storage, friend_webid, friend_storage) {
    await approvedSentNotification(storage, friend_webid);
    await addRequestingPersontoACL(storage, friend_webid);
    await sendRequestAcceptedNotification(webid, storage, friend_storage);
}

async function approvedSentNotification(storage, friend_webid) {
    const inbox = storage + inbox_file;

    const query = `DELETE DATA {<> <http://tobeadded.com/LocationRequestedBy> <${friend_webid}>.}`;
    // Send a PATCH request the pod url to names.ttl 
    const response = await fetch(inbox, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: query
    });
    if (300 < response.status && response.status < 600) {
        throw new Error("Your friend has not used our app yet or the entry could not be deleted!");
    }
    else {
        const query = `INSERT DATA {<> <http://tobeadded.com/YouGrantedAccessTo> <${friend_webid}>.}`;
        // Send a PATCH request the pod url to names.ttl 
        const response = await fetch(inbox, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/sparql-update' },
            body: query
        });
        if (300 < response.status && response.status < 600) {
            throw new Error("Your friend has not used our app yet or the entry could not be deleted!");
        }
    }
}

async function addRequestingPersontoACL(storage, friend_webid) {
    const container = storage + container_path;

    const query_extra = `:Read
        a acl:Authorization;
        acl:accessTo D:;
        acl:agent <${friend_webid}>;
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
}

async function sendRequestAcceptedNotification(webid, storage, friend_storage) {
    const friend_inbox = friend_storage + inbox_file;
    const container = storage + container_path;
    const query = `INSERT DATA {<${webid}> <http://tobeadded.com/GrantedAccessToLocation> <${container}>.}`;
    // Send a PATCH request the pod url to inbox.ttl 
    const response = await fetch(friend_inbox, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: query
    });
    if (300 < response.status && response.status < 600) {
        throw new Error(` HTTP fetch Error code is ${response.status} Your friend may not have used our app yet!`)
    }
}