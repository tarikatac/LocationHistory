import { User } from "../models/user";

// query engine gives error when invalid source is used. fix:
window.setImmediate = window.setTimeout;

const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const myEngine = new QueryEngine();


export async function getIssuerFromWebID(webid) {
    if(!webid)
        return null;

    try {
        const bindingsStream = await myEngine.queryBindings(`
        SELECT ?o WHERE {
        ?s <http://www.w3.org/ns/solid/terms#oidcIssuer> ?o.
        }`, {
            sources: [`${webid}`],
        });

        bindingsStream.on('error', (e) => {
            console.log(e);
        });

        const bindings = await bindingsStream.toArray();
        
        if(bindings && bindings[0] && bindings[0].get('o'))
            return bindings[0].get('o').value;
        return null;

    } catch(error) {
        throw new Error('Error retrieving solid:oidcIssuer');
    }
}

export async function getStorageFromWebID(webid) {
    if(!webid)
        return null;
    
    try {
        const bindingsStream = await myEngine.queryBindings(`
        SELECT ?o WHERE {
        ?s <http://www.w3.org/ns/pim/space#storage> ?o.
        }`, {
            sources: [`${webid}`],
        });

        const bindings = await bindingsStream.toArray();
        
        if(bindings && bindings[0] && bindings[0].get('o'))
            return bindings[0].get('o').value;
        return null;

    } catch(error) {
        throw new Error('Error retrieving pim:storage');
    }
}

export async function getUserDataFromWebID(webid) {
    if(!webid)
        return null;
    
    try {
        const bindingsStream = await myEngine.queryBindings(`
        SELECT ?img ?familyName ?givenName WHERE {
        ?s a foaf:Person.
        OPTIONAL { ?s <http://xmlns.com/foaf/0.1/img> ?img. }
        OPTIONAL { ?s <http://xmlns.com/foaf/0.1/familyName> ?familyName. }
        OPTIONAL { ?s <http://xmlns.com/foaf/0.1/givenName> ?givenName. }
        }`, {
              sources: [`${webid}`],
          });

        const bindings = await bindingsStream.toArray();
        if(bindings && bindings[0])
            return {
                givenName: bindings[0].get('givenName') ? bindings[0].get('givenName').value : null,
                familyName: bindings[0].get('familyName') ? bindings[0].get('familyName').value : null,
                img: bindings[0].get('img') ? bindings[0].get('familyName').value : null
            };
        return null;

    } catch(error) {
        throw new Error(`Error retrieving user data for ${webid}`);
    }
}

export async function createUserFromWebID(webid) {
    const u = new User(webid);

    u.oidcIssuer = await getIssuerFromWebID(webid);
    u.storage = await getStorageFromWebID(webid);
    const userData = await getUserDataFromWebID(webid);
    if(userData) {
        u.img = userData.img;
        u.familyName = userData.familyName;
        u.givenName = userData.givenName;
    }

    return u;
}