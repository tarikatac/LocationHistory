import { fetch as solidfetch } from "@inrupt/solid-client-authn-browser";

// query engine gives error when invalid source is used. fix:
window.setImmediate = window.setTimeout;

const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const myEngine = new QueryEngine();

const storage_path = 'public/YourLocationHistory/';
const container_path = storage_path + 'Data/';
const inbox_file = storage_path + 'inbox.ttl';
const aggregates_path = storage_path + 'Aggregates/';

async function myfetchFunction(url) {
    return await solidfetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/sparql-update', 'Cache-Control': 'no-cache' },
        credentials: 'include'
    });
}

export async function checkInbox(storage) {
    if(!storage)
        return false;

    const file = storage + inbox_file;
    let response_;
    try {
        // Send a GET request to check if inbox exists
        response_ = await solidfetch(file, {
            method: 'GET',
            headers: { 'Content-Type': 'text/turtle' },
            credentials: 'include'
        });
    } catch (error) {
        throw new Error("Could not access inbox");
    }

    return (200 <= response_.status && response_.status < 300);
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
        throw new Error("Could not access storage");
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
            throw new Error("Could not access storage");
        }

        if (response.status >= 400) {
            throw new Error("Could not create inbox in your storage");
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

export async function giveAccessoftheContainertoOwner(webid, storage) {
    const container = storage + container_path;
    const aggContainer = storage + aggregates_path;

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
        acl:agent <${webid}>;
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



    //aggregate container
    response_;
    try {
        response_ = await solidfetch(aggContainer + '.acl', {
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
        acl:agent <${webid}>;
        acl:default D:;
        acl:mode acl:Control, acl:Read, acl:Write.`

        let response;
        try {
            // Send a PUT request to post to the source
            response = await solidfetch(aggContainer + '.acl', {
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
    const aggContainer = storage + aggregates_path;

    const query_extra = `
        :Read
        a acl:Authorization;
        acl:accessTo D:;
        acl:agent <${friend_webid}>;
        acl:default D:;
        acl:mode acl:Read.
        `;
    // Send a GET and PUT request to update the source
    const r1 = await solidfetch(container + '.acl', {
        method: 'GET',
        headers: { 'Content-Type': 'text/turtle' },
    });
    
    const data = await r1.text();

    if (!data.includes(query_extra)) {
        const query = data + "\n" + query_extra;
        const response_put = await solidfetch(container + '.acl', {
            method: 'PUT',
            headers: { 'Content-Type': 'text/turtle' },
            body: query
        });
    }



    //agg permisions
    const r2 = await solidfetch(aggContainer + '.acl', {
        method: 'GET',
        headers: { 'Content-Type': 'text/turtle' },
    });
    
    const data2 = await r2.text();

    if (!data2.includes(query_extra)) {
        const query = data2 + "\n" + query_extra;
        const response_put = await solidfetch(aggContainer + '.acl', {
            method: 'PUT',
            headers: { 'Content-Type': 'text/turtle' },
            body: query
        });
    }

    console.log("done acl");
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

export async function revokeAccess(webid, storage, friend_webid, friend_storage) {
    await revokingPersonAccessfromACL(storage, friend_webid);
    await deleteRequestAcceptedNotification(webid, storage, friend_storage);
    await removeAccessNotification(storage, friend_webid);
}

async function revokingPersonAccessfromACL(storage, friend_webid) {
    const container = storage + container_path;
    const aggContainer = storage + aggregates_path;

    const query_extra = `
        :Read
        a acl:Authorization;
        acl:accessTo D:;
        acl:agent <${friend_webid}>;
        acl:default D:;
        acl:mode acl:Read.
        `;
    // Send a GET and PUT request to update the source
    const r1 = await solidfetch(container + '.acl', {
        method: 'GET',
        headers: { 'Content-Type': 'text/turtle' },
    });

    const data = await r1.text();

    if (data.includes(query_extra)) {
        const query = data.split(query_extra).join('\n');
        const response_put = await solidfetch(container + '.acl', {
            method: 'PUT',
            headers: { 'Content-Type': 'text/turtle' },
            body: query
        });
    }


    //aggregates
    const r2 = await solidfetch(aggContainer + '.acl', {
        method: 'GET',
        headers: { 'Content-Type': 'text/turtle' },
    });

    const data2 = await r2.text();

    if (data2.includes(query_extra)) {
        const query = data2.split(query_extra).join('\n');
        const response_put = await solidfetch(aggContainer + '.acl', {
            method: 'PUT',
            headers: { 'Content-Type': 'text/turtle' },
            body: query
        });
    }
}

async function deleteRequestAcceptedNotification(webid, storage, friend_storage) {
    const container = storage + container_path;
    const friend_inbox = friend_storage + inbox_file;
    const query = `DELETE DATA {<${webid}> <http://tobeadded.com/GrantedAccessToLocation> <${container}>.}`;
    // Send a PATCH request the pod url to inbox.ttl 
    const response = await fetch(friend_inbox, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: query
    });
    if (300 < response.status && response.status < 600) {
        throw new Error(` HTTP fetch Error code is ${response.status}`);
    }
}

async function removeAccessNotification(storage, friend_webid) {
    const inbox = storage + inbox_file;
    const query = `DELETE DATA {<> <http://tobeadded.com/YouGrantedAccessTo> <${friend_webid}>.}`;
    // Send a PATCH request the pod url to names.ttl 
    const response = await fetch(inbox, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: query
    });
    if (300 < response.status && response.status < 600) {
        throw new Error("Your friend has not used our app yet or the entry could not be deleted!")
    }
}

// returns an array of all webid/containers the user has access to
export async function getAccessGrantedNotifications(storage) {
    let haveAccess = [];
    const inbox = storage + inbox_file;

    const bindingsStream = await myEngine.queryBindings(`
        SELECT ?acptr_webid ?lctn_container WHERE {
            ?acptr_webid  <http://tobeadded.com/GrantedAccessToLocation> ?lctn_container.
        }`, {
        sources: [`${inbox}`],
        fetch: myfetchFunction,
    });

    myEngine.invalidateHttpCache();

    const bindings = await bindingsStream.toArray();
    bindings.forEach((element) => {
        haveAccess.push({
            webid: element.get('acptr_webid').value,
            container: element.get('lctn_container').value
        });
    });

    return haveAccess;
}

export async function getLatestLocation(storage) {
    // Fetch the latest timestamp 
    const container = storage + container_path;
    let bindingsStream;

    bindingsStream = await myEngine.queryBindings(`
        SELECT (STRAFTER(?fileName, "/YourLocationHistory/Data/") AS ?tmstmp) 
        WHERE {
            ?s <http://www.w3.org/ns/ldp#contains> ?name .
            BIND (STR(?name) AS ?fileName)
        }
        ORDER BY DESC(?tmstmp)`, {
        sources: [`${container}`],
        fetch: myfetchFunction,
        httpIncludeCredentials: true
    });
    myEngine.invalidateHttpCache();


    // Consume results as an array (easier)
    const bindings = await bindingsStream.toArray();

    // no location data
    if(!bindings[0])
        return null;

    const tmstmp = bindings[0].get('tmstmp').value;
    //---------------------------------------------------------------------------------------
    //Fetch the lat-long from the file corresponding to the latest timestamp
    const bindingsStream_1 = await myEngine.queryBindings(`
        SELECT ?lat ?long ?tm WHERE {
            ?s <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat ;
            <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long .
            OPTIONAL { ?s <https://w3id.org/transportmode#transportMode> ?tm. }
        }`, {
        sources: [`${container}${bindings[0].get('tmstmp').value}`],
        fetch: myfetchFunction,
        httpIncludeCredentials: true
    });

    const bindings_1 = await bindingsStream_1.toArray();

    let tm = 'other';
    if(bindings_1[0].get('tm')) {
        const val = bindings_1[0].get('tm').value.toLowerCase();
        if(val.includes("walking")) {
            tm = "walking";
        } else if(val.includes("bicycling")) {
            tm = "bicycle"
        } else if(val.includes("car")) {
            tm = "car";
        }
    }

    //Return the latest Latitude and Longitude:
    return {
        lat: bindings_1[0].get('lat').value,
        long: bindings_1[0].get('long').value,
        timestamp: tmstmp,
        transportMode: tm
    };
}

export async function putNewLocation(webid, storage, loc, platform, transportMode) {
    const container = storage + container_path;
    
    let transportModeString;
    switch (transportMode) {
        case 'walking':
            transportModeString = 'tm:transportMode tm:Walking.';
            break;
        case 'bicycle':
            transportModeString = 'tm:transportMode tm:Bicycling.';
            break;
        case 'car':
            transportModeString = 'tm:transportMode tm:CarDriving.';
            break;
        default:
            break;
    }

    const query = `@prefix sosa: <http://www.w3.org/ns/sosa/>.
        @prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>.
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
        @prefix plh: <https://w3id.org/personallocationhistory#> .
        @prefix tm: <https://w3id.org/transportmode#> .
        @prefix geo: <http://www.opengis.net/ont/geosparql#>.
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.

        <${platform}> a sosa:Platform;
        sosa:hosts <locationSensor>.

        <locationSensor> a sosa:Sensor;
        sosa:madeObservation <>;
        sosa:observes <location>;
        sosa:isHostedBy <${platform}>.

        <> a sosa:Observation;
        sosa:observedProperty <location> ;
        sosa:hasResult <_result>;
        sosa:featureOfInterest <${webid}> ;
        sosa:hasSimpleResult "POINT(${loc.long} ${loc.lat})"^^geo:wktLiteral ;
        sosa:madeBySensor <locationSensor>;
        sosa:resultTime "${new Date(Number(loc.timestamp)).toISOString()}"^^xsd:dateTime.

        <_result> a sosa:Result;
        wgs84:long ${loc.long};
        wgs84:lat ${loc.lat} ${transportModeString ? ";" : "."}
        ${transportModeString ? transportModeString : ""}

        <location> a sosa:ObservableProperty;
        rdfs:label "Location"@en .

        <${webid}> a sosa:FeatureOfInterest.        `
        // const query = `<> <https://schema.org/latitude> "${position.coords.latitude}";<https://schema.org/longitude> "${position.coords.longitude}";<http://purl.org/dc/terms/created> "${position.timestamp}".`

        // Send a PUT request to post to the source
        const response = await solidfetch(container + `${loc.timestamp}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/turtle' },
            body: query,
            credentials: 'include'
        });
}

async function checkAggregateLocationDay(storage, day) {
    if(!storage || !day)
        return false;

    const file = storage + aggregates_path + day;

    let response_;
    try {
        // Send a GET request to check if inbox exists
        response_ = await solidfetch(file, {
            method: 'GET',
            headers: { 'Content-Type': 'text/turtle' },
            credentials: 'include'
        });
    } catch (error) {
        throw new Error("Could not access " + day);
    }

    return (200 <= response_.status && response_.status < 300);
}

// stores the location entry in an aggregation per day
export async function putNewLocationToAggregate(webid, storage, loc, platform, transportMode) {
    const container = storage + aggregates_path;
    let t = new Date(Number(loc.timestamp));
    t.setHours(0,0,0,0);
    const day = t.getTime();


    let transportModeString;
    switch (transportMode) {
        case 'walking':
            transportModeString = 'tm:transportMode tm:Walking.';
            break;
        case 'bicycle':
            transportModeString = 'tm:transportMode tm:Bicycling.';
            break;
        case 'car':
            transportModeString = 'tm:transportMode tm:CarDriving.';
            break;
        default:
            break;
    }

    const queryInner = `
        <${platform}> a sosa:Platform;
        sosa:hosts <locationSensor>.

        <locationSensor> a sosa:Sensor;
        sosa:madeObservation <locationObservation_${loc.timestamp}>;
        sosa:observes <location>;
        sosa:isHostedBy <${platform}>.

        <locationObservation_${loc.timestamp}> a sosa:Observation;
        sosa:observedProperty <location> ;
        sosa:hasResult <locationObservation_${loc.timestamp}_result>;
        sosa:featureOfInterest <${webid}> ;
        sosa:hasSimpleResult "POINT(${loc.long} ${loc.lat})"^^geo:wktLiteral ;
        sosa:madeBySensor <locationSensor>;
        sosa:resultTime "${new Date(Number(loc.timestamp)).toISOString()}"^^xsd:dateTime.

        <locationObservation_${loc.timestamp}_result> a sosa:Result;
        wgs84:long ${loc.long};
        wgs84:lat ${loc.lat} ${transportModeString ? ";" : "."}
        ${transportModeString ? transportModeString : ""}

        <location> a sosa:ObservableProperty;
        rdfs:label "Location"@en .

        <${webid}> a sosa:FeatureOfInterest.
    `;

    // PUT for new file, patch if file already exists
    let response;
    if(await checkAggregateLocationDay(storage, day)) {
        const query = `
        PREFIX sosa: <http://www.w3.org/ns/sosa/>
        PREFIX wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
        PREFIX plh: <https://w3id.org/personallocationhistory#>
        PREFIX tm: <https://w3id.org/transportmode#>
        PREFIX geo: <http://www.opengis.net/ont/geosparql#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        INSERT DATA {
            ${queryInner}
        }
        `;

        response = await solidfetch(container + `${day}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/sparql-update' },
            body: query,
            credentials: 'include'
        });
    } else {
        const query = `
        @prefix sosa: <http://www.w3.org/ns/sosa/>.
        @prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>.
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
        @prefix plh: <https://w3id.org/personallocationhistory#> .
        @prefix tm: <https://w3id.org/transportmode#> .
        @prefix geo: <http://www.opengis.net/ont/geosparql#>.
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
        ${queryInner}
        `;

        response = await solidfetch(container + `${day}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/turtle' },
            body: query,
            credentials: 'include'
        });
    }
    
    

    console.log(response);
}

export async function getAggregateLocationsBetweenTimestamps(storage, t1, t2) {
    console.log("getAggregateLocationsBetweenTimestamps");

    const container = storage + aggregates_path;

    let t = new Date(Number(t1));
    t.setHours(0,0,0,0);
    const startT1 = t.getTime();

    let bindingsStream;

    bindingsStream = await myEngine.queryBindings(`
        SELECT ?timestamp
        WHERE {
            ?s <http://www.w3.org/ns/ldp#contains> ?name .
            BIND (STRAFTER(STR(?name), "${container}") AS ?timestamp)
            FILTER (?timestamp >= "${startT1}" && ?timestamp <= "${t2}")
        }
        ORDER BY ASC(?timestamp)`, {
        sources: [`${container}`],
        fetch: myfetchFunction,
        httpIncludeCredentials: true
    });
    myEngine.invalidateHttpCache();

    const bindings = await bindingsStream.toArray();

    console.log(bindings.length);
   
    // no location data
    if(!bindings || ! bindings[0])
        return null;

    let locations = [];
    for(let binding of bindings) {
        const day = binding.get('timestamp').value;

        const bindingsStream_1 = await myEngine.queryBindings(`
            SELECT ?lat ?long ?tm ?timestamp
            WHERE {
                ?s a <http://www.w3.org/ns/sosa/Result>;
                <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat ;
                <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long.
                OPTIONAL { ?s <https://w3id.org/transportmode#transportMode> ?tm. }
    
                BIND(STRBEFORE(STRAFTER(STR(?s), "${container}locationObservation_"), "_result") as ?timestamp)
    
                FILTER (?timestamp >= "${t1}" && ?timestamp <= "${t2}")
            }
            ORDER BY ASC(?timestamp)`, {
            sources: [`${container}${day}`],
            fetch: myfetchFunction,
            httpIncludeCredentials: true
        });

        const bindings_1 = await bindingsStream_1.toArray();

        // no location data
        if(!bindings_1 || ! bindings_1[0])
            return null;

        for(let binding_1 of bindings_1) {
            let tm = 'other';
            if(binding_1.get('tm')) {
                const val = binding_1.get('tm').value.toLowerCase();
                if(val.includes("walking")) {
                    tm = "walking";
                } else if(val.includes("bicycling")) {
                    tm = "bicycle"
                } else if(val.includes("car")) {
                    tm = "car";
                }
            }

            locations.push({
                lat: binding_1.get('lat').value,
                long: binding_1.get('long').value,
                timestamp: binding_1.get('timestamp').value,
                transportMode: tm
            });
        }
    }
    
    console.log(locations);
    return locations;
}

export async function createAggregateLocationsBetweenTimestamps(webid, storage, t1, t2) {
    // frist get all the locations in Data
    const container = storage + container_path;
    const aggContainer = storage + aggregates_path;
    let bindingsStream;

    bindingsStream = await myEngine.queryBindings(`
        SELECT ?timestamp
        WHERE {
            ?s <http://www.w3.org/ns/ldp#contains> ?name .
            BIND (STRAFTER(STR(?name), "/YourLocationHistory/Data/") AS ?timestamp)
            FILTER (?timestamp >= "${t1}" && ?timestamp <= "${t2}")
        }
        ORDER BY ASC(?timestamp)`, {
        sources: [`${container}`],
        fetch: myfetchFunction,
        httpIncludeCredentials: true
    });
    myEngine.invalidateHttpCache();

    
    const bindings = await bindingsStream.toArray();


    // no location data
    if(!bindings || ! bindings[0])
        return null;


    // some locations might be already in the aggregation. These can be excluded and dont need to be requested
    let excludes = [];
    let toBeExcluded = await getAggregateLocationsBetweenTimestamps(storage, t1, t2);
    if(toBeExcluded && toBeExcluded.length > 0)
        excludes = toBeExcluded.map(x => x.timestamp);
    console.log("agg excluded:", excludes.length);

    let i = 0;

    // map timestamp_day => [locs]
    let locations = new Map();
    for(let binding of bindings) {
        const timestamp = binding.get('timestamp').value;

        let t = new Date(Number(timestamp));
        t.setHours(0,0,0,0);
        const day = t.getTime();

        if(!locations.has(day))
            locations.set(day, new Array());

        console.log("agg", `${++i}/${bindings.length}`, timestamp);

        if(!excludes.includes(timestamp)) {
            const bindingsStream_1 = await myEngine.queryBindings(`
                SELECT ?platform ?lat ?long ?tm WHERE {
                    ?platform a <http://www.w3.org/ns/sosa/Platform>.
                    ?s <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat ;
                    <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long.
                    OPTIONAL { ?s <https://w3id.org/transportmode#transportMode> ?tm. }
                }`, {
                sources: [`${container}${timestamp}`],
                fetch: myfetchFunction,
                httpIncludeCredentials: true
            });

            const bindings_1 = await bindingsStream_1.toArray();


            locations.get(day).push({
                platform: bindings_1[0].get('platform') ?  bindings_1[0].get('platform').value : null,
                lat: bindings_1[0].get('lat').value,
                long: bindings_1[0].get('long').value,
                timestamp: timestamp,
                transportMode: (bindings_1[0].get('tm') ? bindings_1[0].get('tm').value : null)
            });
        }
    }

    for(let [day, locs] of locations) {
        if(!locs || locs.length <= 0)
            continue;

        let platform = locs[0].platform;
        //create the query
        let queryInner = `
        <${platform}> a sosa:Platform;
        sosa:hosts <locationSensor>.

        <locationSensor> a sosa:Sensor;`;

        if(locs.length > 0) {
            queryInner += `
            sosa:madeObservation <locationObservation_${locs[0].timestamp}>`;
        }
        
        for(let j = 1; j < locs.length; j++) {
            queryInner += `, <locationObservation_${locs[j].timestamp}>`;
        }

        queryInner += `;`;
        
        queryInner +=`
        sosa:observes <location>;
        sosa:isHostedBy <${platform}>.
        `;
        
        for(let loc of locs) {
            queryInner += `
            <locationObservation_${loc.timestamp}> a sosa:Observation;
            sosa:observedProperty <location> ;
            sosa:hasResult <locationObservation_${loc.timestamp}_result>;
            sosa:featureOfInterest <${webid}> ;
            sosa:hasSimpleResult "POINT(${loc.long} ${loc.lat})"^^geo:wktLiteral ;
            sosa:madeBySensor <locationSensor>;
            sosa:resultTime "${new Date(Number(loc.timestamp)).toISOString()}"^^xsd:dateTime.

            <locationObservation_${loc.timestamp}_result> a sosa:Result;
            wgs84:long ${loc.long};
            wgs84:lat ${loc.lat} ${loc.transportMode ? ";" : "."}
            ${loc.transportMode ? `<https://w3id.org/transportmode#transportMode> <${loc.transportMode}>.` : ""}
            `;
        }
        

        queryInner +=`
        <location> a sosa:ObservableProperty;
        rdfs:label "Location"@en .

        <${webid}> a sosa:FeatureOfInterest.
        `;

        let response;
        // if not yet exist put a new one else patch it
        if(await checkAggregateLocationDay(storage, day)) {
            const query = `
            PREFIX sosa: <http://www.w3.org/ns/sosa/>
            PREFIX wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
            PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
            PREFIX plh: <https://w3id.org/personallocationhistory#>
            PREFIX tm: <https://w3id.org/transportmode#>
            PREFIX geo: <http://www.opengis.net/ont/geosparql#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            INSERT DATA {
                ${queryInner}
            }
            `;
    
            response = await solidfetch(aggContainer + `${day}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/sparql-update' },
                body: query,
                credentials: 'include'
            });
        } else {
            const query = `
            @prefix sosa: <http://www.w3.org/ns/sosa/>.
            @prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>.
            @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
            @prefix plh: <https://w3id.org/personallocationhistory#> .
            @prefix tm: <https://w3id.org/transportmode#> .
            @prefix geo: <http://www.opengis.net/ont/geosparql#>.
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
            ${queryInner}
            `;
    
            response = await solidfetch(aggContainer + `${day}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/turtle' },
                body: query,
                credentials: 'include'
            });
        }
        console.log(response);
    }
}

// retrieves all the locations between t1 and t2. without retrieving the locations that are present in exclude. exclude is an array of timestamps
export async function getLocationsBetweenTimestamps(storage, t1, t2, excludes = []) {
    console.log("getLocationsBetweenTimestamps");
    // Fetch the latest timestamp 
    const container = storage + container_path;
    let bindingsStream;

    bindingsStream = await myEngine.queryBindings(`
        SELECT (STRAFTER(?fileName, "/YourLocationHistory/Data/") AS ?tmstmp)
        WHERE {
            ?s <http://www.w3.org/ns/ldp#contains> ?name .
            BIND (STR(?name) AS ?fileName)
            FILTER (STRAFTER(?fileName, "/YourLocationHistory/Data/") >= "${t1}" && STRAFTER(?fileName, "/YourLocationHistory/Data/") <= "${t2}")
        }
        ORDER BY ASC(?tmstmp)`, {
        sources: [`${container}`],
        fetch: myfetchFunction,
        httpIncludeCredentials: true
    });
    myEngine.invalidateHttpCache();


    // Consume results as an array (easier)
    const bindings = await bindingsStream.toArray();

    console.log(bindings.length);

    // no location data
    if(!bindings || ! bindings[0])
        return null;

    let locations = [];
    for(let binding of bindings) {
        const timestamp = binding.get('tmstmp').value;

        if(!excludes.includes(timestamp)) {
            const bindingsStream_1 = await myEngine.queryBindings(`
                SELECT ?lat ?long ?tm WHERE {
                    ?s <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat ;
                    <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long.
                    OPTIONAL { ?s <https://w3id.org/transportmode#transportMode> ?tm. }
                }`, {
                sources: [`${container}${timestamp}`],
                fetch: myfetchFunction,
                httpIncludeCredentials: true
            });

            const bindings_1 = await bindingsStream_1.toArray();

            let tm = 'other';
            if(bindings_1[0].get('tm')) {
                const val = bindings_1[0].get('tm').value.toLowerCase();
                if(val.includes("walking")) {
                    tm = "walking";
                } else if(val.includes("bicycling")) {
                    tm = "bicycle"
                } else if(val.includes("car")) {
                    tm = "car";
                }
            }

            locations.push({
                lat: bindings_1[0].get('lat').value,
                long: bindings_1[0].get('long').value,
                timestamp: timestamp,
                transportMode: tm
            });
        }
    }
    
    return locations;
}