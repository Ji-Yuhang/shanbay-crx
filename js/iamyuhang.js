function iamyuhang_user(){
    try {
        var user = JSON.parse(localStorage['iamyuhang_user']);
        return user;
    } catch(e) {
        return null;
    }
}
function iamyuhang_user_is_exist(){
    return localStorage['iamyuhang_user'] && iamyuhang_user() && iamyuhang_user().authentication_token != null;
}

function iamyuhang_user_sign_out(){
    localStorage.setItem('iamyuhang_user', null);

    chrome.runtime.sendMessage({method: 'refresh_iamyuhang_user_status'});
};
function notify_refresh_user_status(){
    chrome.runtime.sendMessage({method: 'refresh_iamyuhang_user_status'});
}




