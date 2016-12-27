/**
 * @author Joseph
 */

checked = false;

$(function () {
    check_in();
    setTimeout(function () {
        checked = false;
        //check_in();
    }, 3 * 60 * 60 * 1000);//每3h提醒一次

    chrome.contextMenus.removeAll(function () {
        if (localStorage['ctx_menu'] != 'no') {
            chrome.contextMenus.create({
                "title": '在扇贝网中查找"%s"',
                "contexts": ["selection"],
                "onclick": function (info, tab) {
                    isUserSignedOn(function () {
                        getClickHandler(info.selectionText, tab);
                    });
                }
            });
        }
    });
    //login_iamyuhang();
    parse_html_body();
});

var notified = false;

function notify(title, message, url) {
    if (!title) {
        title = "背单词读文章练句子"
    }
    if (!message) {
        message = "少壮不努力，老大背单词！";
    }
    if (!url) {
        url = "http://www.shanbay.com/";
    }
    var opt = {
        type: "basic",
        title: title,
        message: message,
        iconUrl: "icon_48.png"
    };
    var notId = Math.random().toString(36);
    if (!notified && ls()['not_pop'] != 'no') {
        notification = chrome.notifications.create(notId, opt, function (notifyId) {
            console.info(notifyId + " was created.");
            notified = true;
        });
    }
    chrome.notifications.onClicked.addListener(function (notifyId) {
        console.info("notification was clicked");
        chrome.notifications.clear(notifyId, function () {
        });
        if (notId == notifyId) {
            chrome.tabs.create({
                url: url
            })
        }
        notified = false;
    });
    setTimeout(function () {
        chrome.notifications.clear(url, function () {
        });
    }, 5000);
}

function notify_login() {
    notify("", "请登录……", "http://shanbay.com/accounts/login/");
};


function check_in() {
    //login_iamyuhang();
    var check_in_url = "http://www.shanbay.com/api/v1/checkin/";
    $.getJSON(check_in_url, function (json) {
        var arry = json.data.tasks.map(function (task) {
            return task.meta.num_left;
        });
        var m = max(arry);
        localStorage['checkin'] = m;
        if (0 == m) {
            chrome.browserAction.setBadgeText({text: ''});
        }
        else if (m > 0) {
            chrome.browserAction.setBadgeText({text: m + ''});
            //notified = false;
            notify();
        }
    }).fail(function () {
        //notified = false;
        notify();
    });
    checked = true;
};

function login_iamyuhang_with_params(email,password,sendResponse){
    //console.log('login_iamyuhang_with_params',email,password);
    if (iamyuhang_user_is_exist()) {
        //console.log("iamyuhang_user", iamyuhang_user());
        //return;
    } 
    //localStorage.setItem('shanbay_cookies', cookie);
    $.ajax({
        //async: false,
        url: 'https://iamyuhang.com/api/v1/users/sign_in/',
        //url: 'http://localhost:3001/api/v1/users/sign_in/',
        type: 'POST',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({
            email: email,
            password: password,
        }),

        success: function (da) {
            //sendResponse('will callback',da);
            if (da.token) {
                //localStorage.setItem('iamyuhang_user_token', da.token);
                localStorage.setItem('iamyuhang_user', JSON.stringify(da.user));
                console.log('login_iamyuhang success', da);
                //sendResponse({status:'success', token:da.token, user: da.user});
            } else {
                console.log('login_iamyuhang eamil or password error', da);
                //sendResponse({status:'fail'});
            }
            notify_refresh_user_status();
        },
        error: function (xhr,status, err) {
            console.log('login_iamyuhang error',xhr,status,err);
            //sendResponse({status:'error'});
            notify_refresh_user_status();
        },
        complete: function () {
            console.log('login_iamyuhang complete');
            //sendResponse({status:'complete'});
            notify_refresh_user_status();
        }
    });

}
function login_iamyuhang(){
    //console.log('login_iamyuhang');
    var email = 'yuhang.silence@gmail.com';
    var password = '';
    login_iamyuhang_with_params(email,password);

};

function max(array) {
    if (undefined == array || array.length == 0) return 0;
    var max = array[0];
    array.forEach(function (e) {
        if (e > max) max = e;
    });
    return max;
}

function saveToStorage() {
    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set({ls:JSON.stringify(localStorage)}, function() {
        // Notify that we saved.
        console.log('localStorage saved in chrome.storage.sync');
    });
}
chrome.extension.onRequest.addListener(function(request,sender,sendResponse){
    console.log("chrome.extension.onRequest: " + request,sender,sendResponse);
});
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("received method: " + request);
    if(request.method != 'getLocalStorage') {
        console.log("received method: " + request.method);
        console.log(request);
    }
    switch (request.method) {
        case "getLocalStorage":
            chrome.storage.sync.get("ls", function(value) {
                // Notify that we saved.
                try {
                    var valueString = value.ls;
                    var items = JSON.parse(valueString);
                    for (var k in items) {
                        if (undefined != items[k])
                            localStorage[k] = items[k];
                    }
                    console.log("fetched local storage from chrome.storage.sync");
                } catch (e) {
                    saveToStorage();
                    console.warn(e);
                }
            });
            sendResponse({data: localStorage});
            break;
        case "setLocalStorage":
            window.localStorage = request.data;
            saveToStorage();
            sendResponse({data: localStorage});
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
        case 'forgetWord':
            forgetWordInBrgd(request.data, sender.tab);
            break;
        case 'openSettings':
            chrome.tabs.create({url: chrome.runtime.getURL("options.html") + '#' + request.anchor});
            break;
        case 'playAudio':
            playAudio(request.data['audio_url']);
            break;
        case 'getEtymology':
            getOnlineEtymology(request.data.term, function (term, obj) {
                sendResponse();
                chrome.tabs.sendMessage(sender.tab.id, {
                    callback: 'showEtymology',
                    data:{term:term, json:obj}
                });
            });
            break;
        case 'findDerivatives':
            function showDerivatiresCallback(data) {
                chrome.tabs.sendMessage(sender.tab.id, {
                    callback: 'showDerivatives',
                    data: data
                });
            }
            findDerivatives(request.data.term, showDerivatiresCallback);
            break;
        case 'popupEtymology':
            var xhr = new XMLHttpRequest();
            xhr.open("GET", request.data.url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    var roots = parseEtymology(xhr.responseText);
                    chrome.tabs.sendMessage(sender.tab.id, {
                        callback: 'popupEtymology',
                        data: {
                            originAnchor: request.data.originAnchor,
                            term: request.data.term,
                            roots: roots
                        }
                    });
                }
            };
            xhr.send();
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


function addNewWordInBrgd(data, tab) {
    chrome.cookies.getAll({"url": 'http://www.shanbay.com'}, function (cookies) {
       /* $.ajax({*/
            //url: 'http://www.shanbay.com/api/v1/bdc/learning/',
            //type: 'POST',
            //dataType: 'JSON',
            //contentType: "application/json; charset=utf-8",
            //data: JSON.stringify({
                //content_type: "vocabulary",
                //id: word_id
            //}),
            //success: function (data) {
                //chrome.tabs.sendMessage(tab.id, {
                    //callback: 'addWord',
                    //data: {msg: 'success', rsp: data.data}
                //});
                //console.log('success');
            //},
            //error: function () {
                //chrome.tabs.sendMessage(tab.id, {
                    //callback: 'addWord',
                    //data: {msg: 'error', rsp: {}}
                //});
                //console.log('error');
            //},
            //complete: function () {
                //console.log('complete');
            //}
        /*});*/
      
    });
    if (iamyuhang_user_is_exist()) {
        $.ajax({
            url: 'https://iamyuhang.com/api/v1/words/learning/',
            //url: 'http://localhost:3001/api/v1/words/learning/',
            type: 'POST',
            dataType: 'JSON',
            contentType: "application/json; charset=utf-8",
            /*            data: JSON.stringify({*/
            //content_type: "vocabulary",
            //id: word_id
            /*}),*/
            data: JSON.stringify({
                //content_type: "vocabulary",
                word_id: data.word_id,
                word: data.data.content,
                token: iamyuhang_user().authentication_token
            }),

            success: function (data) {
                console.log('ajax success',data);
                if (data.status == 'ok') {
                    chrome.tabs.sendMessage(tab.id, {
                        callback: 'addWord',
                        data: {msg: 'success', rsp: data.data}
                    });
                }
            },
            error: function (xhr,status, error) {
                chrome.tabs.sendMessage(tab.id, {
                    callback: 'addWord',
                    data: {msg: 'error', rsp: {}}
                });
                console.log('error',xhr,status,error);
            },
            complete: function () {
                console.log('complete');
            }
        });
    }

}

function forgetWordInBrgd(learning_id, tab) {
    chrome.cookies.getAll({"url": 'http://www.shanbay.com'}, function (cookies) {
        $.ajax({
            url: 'http://www.shanbay.com/api/v1/bdc/learning/' + learning_id,
            type: 'PUT',
            dataType: 'JSON',
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({
                retention: 1
            }),
            success: function (data) {
                chrome.tabs.sendMessage(tab.id, {
                    callback: 'forgetWord',
                    data: {msg: 'success', rsp: data.data}
                });
                console.log('success');
            },
            error: function () {
                chrome.tabs.sendMessage(tab.id, {
                    callback: 'forgetWord',
                    data: {msg: 'error', rsp: {}}
                });
                console.log('error');
            },
            complete: function () {
                console.log('complete');
            }
        });
    });
}

function normalize(word) {
    return word.replace(/·/g, '');
}

var getLocaleMessage = chrome.i18n.getMessage;
var API = 'http://www.shanbay.com/api/v1/bdc/search/?word=';


function isUserSignedOn(callback) {
    chrome.cookies.get({"url": 'http://www.shanbay.com', "name": 'sessionid'}, function (cookie) {
        if (cookie) {
            localStorage.setItem('shanbay_cookies', cookie);
            callback();
        } else {
            localStorage.removeItem('shanbay_cookies');
            notified = false;
            notify_login();
        }
    });
}

function getClickHandler(term, tab, wholeText) {
    console.log('signon');
    var url = API + normalize(term);//normalize it only

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            console.log('success');
            if ((1 == data.status_code) || localStorage['search_webster'] == 'yes')
                getOnlineWebsterCollegiate(term, function (term, json) {
                    var defs = json.fls.map(function (i) {
                        return "<span class='web_type'>" + json.fls[i].textContent + '</span>, ' + json.defs[i].textContent
                    }).toArray().join('<br/>');
                    chrome.tabs.sendMessage(tab.id, {
                        callback: 'popover',
                        data: {
                            shanbay: data,
                            wholeText: wholeText,
                            webster: {term: json.hw[0].textContent.replace(/\*/g, '·'), defs: defs}
                        }
                    });
                });
            else chrome.tabs.sendMessage(tab.id, {
                callback: 'popover',
                data: {shanbay: data, wholeText: wholeText}
            });
        },
        error: function () {
            console.log('error');
        },
        complete: function () {
            console.log('complete');
        }
    });
}

function singularize(word) {
    var specailPluralDic = {
        'men': 'man',
        'women': 'woman',
        'children': 'child'
    };
    var result = specailPluralDic[word];
    if (result) {
        return result;
    }

    var pluralRule = [{
        'match': /s$/,
        'replace': ''
    }];

    for (var j = 0; j < pluralRule.length; j++) {
        if (word.match(pluralRule[j].match)) {
            return word.replace(pluralRule[j].match, pluralRule[j].replace);
        }
    }

    return word;
}

function playAudio(audio_url) {
    if (audio_url) {
        new Howl({
            src: [audio_url],
            volume: 1.0
        }).play();
    }
};

function parse_html_body(){
    var html = document.body.innerHTML;
    return;
    //console.log('parse_html_body');
    $.ajax({
        //url: 'http://localhost:3000/api/v1/words/parse_html/',
        url: 'https://iamyuhang.com/api/v1/words/parse_html/',
        type: 'POST',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({
            //token: token_obj.value
            html: html
        }),

        success: function (data) {
            //console.log('parse_html_body  success',data);
        },
        error: function (xhr,status, error) {
            //console.log('parse_html_body error',xhr,status,error);
        },
        complete: function () {
            //console.log('parse_html_body complete');
        }
    });
};
