export function displayRequestLocationLoading() {
    document.querySelector("#friends > div > div.progress").classList.remove("invisible");
}

export function hideRequestLocationLoading() {
    document.querySelector("#friends > div > div.progress").classList.add("invisible");
}

export function setRequestLocationMessage(text) {
    let req_message = document.getElementById('req-message');
    req_message.textContent = text;
    req_message.classList.remove("hidden");
}