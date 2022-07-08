//TODO: add location history logic here
import { fetch as solidfetch } from "@inrupt/solid-client-authn-browser";

const storage_path = 'public/YourLocationHistory/';
const container_path = storage_path + 'Data/';
const inbox_file = storage_path + 'inbox.ttl';

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