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
var API = 'http://www.shanbay.com/api/v1/bdc/search/?word=';
function on_selected_text(request, sender, sendResponse) {
    console.log('iamyuhang.js on_selected_text:', request, sender);
    let url = encodeURI(API + request.selected_text[0]);
    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            console.log('shanbay api success', data);
            chrome.tabs.sendMessage(sender.tab.id, {
                method: 'shanbay_data',
                shanbay: data
            });
        }
    });

}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("iamyuhang.js received method: " + request);
    switch (request.method) {
        case 'selected_text':
            on_selected_text(request, sender, sendResponse);
            break;
        case 'is_user_signed_on':
            isUserSignedOn();
            break;
        case 'lookup':
            isUserSignedOn(function () {
                getClickHandler(request.data, sender.tab, request.wholeText);
            });
            break;
        case 'addWord':
            addNewWordInBrgd(request.data, sender.tab);
            break;

        case 'login_iamyuhang_with_params':
            login_iamyuhang_with_params(request.email,request.password,sendResponse);
            break;
        case 'sign_out_iamyuhang':
            iamyuhang_user_sign_out();
            //sendResponse();
            break;
        default :
            sendResponse({data: [], error:'no method match'+ request.method, request:request}); // snub them.
    }
});
