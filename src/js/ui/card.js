import { User } from "../models/user";

const statusMessage = {
    pending : 'Awaiting approval',
    error: 'Error: click for more info',
    revoked : 'No access rights',
    done: 'Shared location',
    loadingRoute: 'Loading route'
}

const friendStatus = new Map();

// TODO: make card show user info like name, img etc. and a status under it
export function addFriendsCard(user, onFriendsCardClick, onCheckboxChange, status = 'pending') {
    let friends_list = document.getElementById('friends-list');

    if(friends_list && document.getElementById("card_" + user.webid) === null) {
        let li = document.createElement('li');
        li.id = "card_" + user.webid;
        li.className = "collection-item avatar";
        li.innerHTML =`
            <i class="material-symbols-outlined circle" style="font-size: 40px;">account_circle</i>
            <span class="title">${user.name}</span>
            <p>${statusMessage[status]}</p>
            <div class="collection-checkbox hidden">
                <label>
                    <input type="checkbox" class="filled-in" checked="" />
                    <span></span>
                </label>    
            </div>
            <div class="user-options-button">
                <span class="material-symbols-outlined grey-text text-darken-2">
                    more_vert
                </span>
            </div>
            <div class="progress ${status == 'pending' ? '' : 'hidden'}">
                <div class="indeterminate"></div>
            </div>
        `;

        li.webid = user.webid;
        li.status = status;

        friends_list.insertBefore(li, friends_list.firstChild);

        let checkbox = li.querySelector("div>label>input");
        checkbox.webid = user.webid;
        checkbox.addEventListener('change', onCheckboxChange);

        li.addEventListener('click', onFriendsCardClick);
    }

    friendStatus.set(user.webid, status);
}

export function updateFriendsCard(user, status = 'done') {
    let friends_list = document.getElementById('friends-list');
    let li =  document.getElementById("card_" + user.webid);

    if(friends_list && li) {
        let checkbox_container = li.querySelector("div.collection-checkbox");
        let bar = li.querySelector(".progress");
        let p = li.querySelector("p");

        if(!checkbox_container || !bar || !p)
            return;
        

        if(status == 'loadingRouteDone') {
            status = 'done';
            friendStatus.set(user.webid, status);
        }

        if(status == 'pending' || status == 'loadingRoute' || friendStatus.get(user.webid) == 'loadingRoute') {
            p.classList.remove("error-font");
            checkbox_container.classList.add("hidden");
            bar.classList.remove("hidden");
        } else if(status == 'error') {
            p.classList.add("error-font");
            checkbox_container.classList.add("hidden");
            bar.classList.add("hidden");
        } else if(status == 'revoked') {
            p.classList.add("error-font");
            checkbox_container.classList.remove("hidden");
            bar.classList.add("hidden");
        } else if (status == 'done') {
            p.classList.remove("error-font");
            checkbox_container.classList.remove("hidden");
            bar.classList.add("hidden");
        }

        if(friendStatus.get(user.webid) != 'loadingRoute' || status == 'loadingRoute') {
            p.innerText = statusMessage[status];
        }

        if(friendStatus.get(user.webid) == 'loadingRoute') {
            friendStatus.set(user.webid, 'loadingRoute');
        } else {
            friendStatus.set(user.webid, status);
        }

    }

    
}

export function removeFriendsCard(user) {
    let li = document.getElementById("card_" + user.webid);
    if(li) {
        li.remove();
    }
}