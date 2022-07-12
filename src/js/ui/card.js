import { User } from "../models/user";

// TODO: make card show user info like name, img etc. and a status under it
// TODO: when click on card go to location on the map
export function addFriendsCard(user, onCheckboxChange) {
    let friends_list = document.getElementById('friends-list');

    if(friends_list && document.getElementById("card_" + user.webid) === null) {
        let li = document.createElement('li');
        li.id = "card_" + user.webid;
        li.className = "collection-item avatar";
        li.innerHTML =`
            <i class="material-symbols-outlined circle" style="font-size: 40px;">account_circle</i>
            <span class="title">${user.name}</span>
            <p>Awaiting approval</p>
            <div class="secondary-content collection-checkbox hidden">
                <label>
                    <input type="checkbox" class="filled-in" checked="" />
                    <span></span>
                </label>
            </div>
            <div class="progress">
                <div class="indeterminate"></div>
            </div>
        `;

        friends_list.insertBefore(li, friends_list.firstChild);

        let checkbox = li.querySelector("div>label>input");
        checkbox.webid = user.webid;
        checkbox.addEventListener('change', onCheckboxChange);
    }
}

export function updateFriendsCard(user) {
    let friends_list = document.getElementById('friends-list');
    let li =  document.getElementById("card_" + user.webid);

    if(friends_list && li) {
        let checkbox_container = li.querySelector("div.collection-checkbox");
        if(checkbox_container && checkbox_container.classList.contains("hidden")) {
            // show checkbox
            checkbox_container.classList.remove("hidden");

            // remove loading bar
            let bar = li.querySelector(".progress");
            bar.classList.add("hidden");

            // edit text
            let p = li.querySelector("p");
            if(p) {

                if(user.hasAccess) {
                    p.innerText = "Shared location";
                } else {
                    p.innerText = "No access";
                }
            }
        }
    }
}

export function removeFriendsCard(user) {
    let li = document.getElementById("card_" + user.webid);
    if(li) {
        li.remove();
    }
}