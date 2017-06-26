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
function get_iamyuhang_thesaurus(sender, word) {
    return;
    let url = encodeURI('https://iamyuhang.com/api/v1/words/thesaurus/?word=' + word);

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            console.log('iamyuhang thesaurus api success', data);
            chrome.tabs.sendMessage(sender.tab.id, {
                method: 'thesaurus_data',
                data: data
            });

        }
    });
};

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
            if (data.msg == 'SUCCESS') {
                get_iamyuhang_thesaurus(sender, data.data.content);
            }
        }
    });

}
function playAudio(audio_url) {
    if (audio_url) {
        new Howl({
            src: [audio_url],
            volume: 1.0
        }).play();
    }
};
function on_add_word(request, sender, sendResponse) {
    console.log('iamyuhang.js on_add_word:', request, sender);
    if (iamyuhang_user_is_exist()) {
        $.ajax({
            url: 'https://iamyuhang.com/api/v1/words/learning/',
            //url: 'http://localhost:3001/api/v1/words/learning/',
            type: 'POST',
            dataType: 'JSON',
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({
                word: request.shanbay.content,
                token: iamyuhang_user().authentication_token
            }),

            success: function (data) {
                console.log('ajax success',data);
                if (data.status == 'ok') {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        method: 'add_word_success',
                        data: data
                    });
                }
            },
            error: function (xhr,status, error) {
                // chrome.tabs.sendMessage(tab.id, {
                //     callback: 'addWord',
                //     data: {msg: 'error', rsp: {}}
                // });
                console.log('error',xhr,status,error);
            }
        });
    }
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
};
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("iamyuhang.js received method: " + request);
    switch (request.method) {
        case 'selected_text':
            on_selected_text(request, sender, sendResponse);
            break;
        case 'add_word':
            on_add_word(request, sender, sendResponse);
            break;
        case 'playAudio':
            playAudio(request.data['audio_url']);
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
