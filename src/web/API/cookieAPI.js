// Файл: cookieAPI.js

function getCookie(name) {
    var cookieName = name + "=";
    var decodedCookies = decodeURIComponent(document.cookie);
    var cookiesArray = decodedCookies.split(';');
    for(var i = 0; i < cookiesArray.length; i++) {
        var cookie = cookiesArray[i];
        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(cookieName) == 0) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }
    return "";
}
export default getCookie
