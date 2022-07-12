export function requestNotificationExists(webid) {
    return document.getElementById("req_" + webid) ? true : false;
}

export function addRequestNotification(webid, onApproveButtonClick) {
    let requests_list = document.querySelector('#requests>.collection');
    let li = document.createElement('li');
    li.className = "collection-item";
    li.id = "req_" + webid;
    li.innerHTML = `
    <div>
    ${webid}
        <div class="secondary-content">
            <button class="waves-effect waves-light btn-small btn-symbol green darken-2">
                <span class="material-symbols-outlined">
                    done
                </span>
            </button>
        </div>
    </div>
    <div class="progress hidden">
        <div class="indeterminate"></div>
    </div>
    `;

    let approve_button = li.querySelector("div>div>button");
    approve_button.webid = webid;
    approve_button.addEventListener('click', onApproveButtonClick);

    // add to dom
    requests_list.insertBefore(li, requests_list.firstChild);
}

export function removeRequestNotification(webid) {
    let li = document.getElementById("req_" + webid);
    if(li) {
        li.remove();
    }
}

export function updateRequestNotification(webid) {
    let li = document.getElementById("req_" + webid);

    if(li) {
        let approve_button = li.querySelector("div>div>button");
        if(approve_button && approve_button.classList.contains('green')) {
            // add X button
            // <button class="waves-effect waves-light btn-small btn-symbol green darken-2">
            //             <span class="material-symbols-outlined">
            //                 done
            //             </span>
            //         </button>
            
            approve_button.classList.add('red');
            approve_button.classList.remove('green');
            approve_button.firstElementChild.textContent = "close";
            approve_button.classList.remove("hidden");

            // remove loading bar
            let bar = li.querySelector(".progress");
            bar.classList.add("hidden");
        }        
    }
}