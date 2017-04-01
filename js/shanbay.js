/**
 * 任意网页扇贝查词
 *
 */

var last_position = {left:null,top:null}

function ls(callback) {
    chrome.runtime.sendMessage({method: "getLocalStorage"}, function (response) {
        if(undefined != response) {
            for (var k in response.data)
                localStorage[k] = response.data[k];
        }
        if(undefined != callback){
            callback();
        }
    });
    return localStorage;
}

function searchingSelectedText () {
    var text = window.getSelection().toString().trim().match(/^[a-zA-Z\s']+$/);
    var wholeText = window.getSelection().anchorNode.wholeText
    console.info("Ji-Yuhang selected " + text, wholeText);
    if (undefined != text && null != text && 0 < text.length && ls()["click2s"] != 'no') {
        console.log("searching " + text);
        chrome.runtime.sendMessage({
            method: 'lookup',
            data: text[0],
            wholeText: wholeText
        });
        popover({
            shanbay: {
                loading: true,
                msg: "查询中....（请确保已登录扇贝网）"
            }
        })
    }
}

$(function () {
    ls(function() {
        $(document).on('dblclick', searchingSelectedText);
    });
});

/**
 *@user https://chrome.google.com/webstore/detail/%E6%89%87%E8%B4%9D%E5%8A%A9%E6%89%8B/nmbcclhheehkbdepblmeclbahadcebhj/details
 **/


chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log("received\n");
    console.log(message.data);
    switch (message.callback) {
        case 'popover':
            popover(message.data);
            break;
        case 'forgetWord':
            switch (message.data.msg) {
                case "success":
                    $('#shanbay-forget-btn').addClass('hide');
                    $('#shanbay_popover .success, #shanbay-check-btn').removeClass('hide');
                    break;
                case "error":
                    $('#shanbay_popover .success').text('添加失败，请重试。').removeClass().addClass('failed');
                    break;
                default:
            }
            break;
        case 'addWord':
            switch (message.data.msg) {
                case "success":
                    $('#shanbay-add-btn').addClass('hide');
                    $('#shanbay_popover .success, #shanbay-check-btn').removeClass('hide');
                    //$('#shanbay-check-btn').attr('href', 'http://www.shanbay.com/review/learning/' + message.data.rsp.word.id);
                    console.log('addWOrd success', message.data, message.data.rsp );
                    $('#shanbay-check-btn').attr('href', 'https://iamyuhang.com/learnings/' + message.data.rsp.learning.id);
                    break;
                case "error":
                    $('#shanbay_popover .success').text('添加失败，请重试。').removeClass().addClass('failed');
                    break;
                default:
            }
            break;
    }
});

function popover(alldata) {
    var parent_is_popver = is_ancestor_contain_id(window.getSelection().anchorNode, 'shanbay_popover');
    //parse_html_body();
    var data = alldata.shanbay;
    var wholeText = alldata.wholeText;
    if (data.data && data.data.content) getThesaurus(data.data.content);
    if (data.data && data.data.content) getPhrase(data.data.content, wholeText);
    var webster = alldata.webster;
    var defs = "";
    if (ls()['webster_search'] == 'yes') defs = webster.defs;
    console.log('popover');
    var html = '<div id="shanbay_popover"><div class="popover-inner"><h3 class="popover-title">';
    if (true == data.loading) { //loading notification
        html += '<p><span class="word">' + data.msg + '</span></p>';
    } else if (data.data == undefined || data.data.learning_id == undefined) {
        if (1 == data.status_code) {// word not exist
            if (undefined == webster || webster.term == "") html += '未找到单词</h3></div>';
            else html += '<p><span class="word">' + webster.term + '</span></p></h3>' +
                '<div class="popover-content"><p>' + webster.defs + "</p></div>";
        } else {// word exist, but not recorded
            html += '<p><span class="word">' + data.data.content + '</span>'
                + '<small class="pronunciation">' + (data.data.pron.length ? ' [' + data.data.pron + '] ' : '') + '</small>'
            + '<span class="shanbay_popover_phrase" id="shanbay_popover_phrase" style="color:blue!important; font-weight:bold!important">' + '</span>'
            + '<span id="shanbay_popover_stars" style="color:#ff5400!important;"></span></p>'
            // Ji-Yuhang remove UK
            html += '<a href="#" class="speak us">US<i class="icon icon-speak"></i></a></h3>'

            html += '<div class="popover-content">'
                + '<p>' + data.data.definition.split('\n').join("<br/>") + "<br/>" + defs + '</p>'
                + '<p id="shanbay_popover_thesaurus">' + '</p>'
                + '<p id="shanbay_popover_verbal_adventages">' + '</p>'
                + '<div class="add-btn"><a href="#" class="btn" id="shanbay-add-btn">添加生词</a>'
                + '<p class="success hide">成功添加！</p>'
                + '<a href="#" target="_blank" class="btn hide" id="shanbay-check-btn">查看</a></div>'
                + '</div>';
        }
    } else {// word recorded
        var forgotUrl = "http://www.shanbay.com/review/learning/" + data.data.learning_id
        html += '<p><span class="word">' + data.data.content + '</span>'
            + '<span class="pronunciation">' + (data.data.pron.length ? ' [' + data.data.pron + '] ' : '') + '</span>'
            + '<span class="shanbay_popover_phrase" id="shanbay_popover_phrase" style="color:blue!important; font-weight:bold!important">' + '</span>'
            + '<span id="shanbay_popover_stars" style="color:#ff5400!important;"></span></p>'

        html += '<a href="#" class="speak us">US<i class="icon icon-speak"></i></a></h3>'

        html += '<div class="popover-content">'
            + '<p>' + data.data.definition.split('\n').join("<br/>") + '</p>'
            + '<p>' + data.data.en_definition.defn.split('\n').join("<br/>") + '</p>'
            + '<p id="shanbay_popover_thesaurus">' + '</p>'
            + '<p id="shanbay_popover_verbal_adventages">' + '</p>'
            + '<div class="add-btn"><a href="#" class="btn" id="shanbay-forget-btn">我忘了</a></div>'
            + '<p class="success hide">成功添加！</p>'
            + '<div class="add-btn"><a href="' + forgotUrl + '" target="_blank" class="btn" id="shanbay-check-btn">查看</a></div>'
            + '</div>';
    }

    html += '</div></div>';

    if (parent_is_popver) {
    }
    $('#shanbay_popover').remove();
    $('body').append(html);

    console.log("----------------------  parent_is_popver ------------------------");
    console.log(parent_is_popver,last_position);
    console.log("----------------------  parent_is_popver ------------------------");
    if (parent_is_popver) {
        setPopoverPosition(last_position.left, last_position.top);
    } else {
        getSelectionOffset(function (left, top) {
            setPopoverPosition(left, top);
            var h =  $(window).scrollTop() + $(window).height();
            if ( h -200 < top && h >= top) {
                $(window).scrollTop(200+$(window).scrollTop());
            }
        });
    }

    $('#shanbay-add-btn').click(function (e) {
        e.preventDefault();
        addNewWord(data.data,data.data.id);
    });

    $('#shanbay-forget-btn').click(function (e) {
        e.preventDefault();
        forgetWord(data.data.learning_id);
    });

    $('#shanbay_popover .speak.us').click(function (e) {
        e.preventDefault();
        var audio_url = 'http://media.shanbay.com/audio/us/' + data.data.content + '.mp3';
        playAudio(audio_url);
    });

    $('#shanbay_popover .speak.uk').click(function (e) {
        e.preventDefault();
        var audio_url = 'http://media.shanbay.com/audio/uk/' + data.data.content + '.mp3';
        playAudio(audio_url);
    });

    $('html').click(function () {
        hidePopover();
    });
    $('body').on('click', '#shanbay_popover', function (e) {
        e.stopPropagation();
    });
}

function hidePopover() {
    $('#shanbay_popover').remove();
}

function getSelectionOffset(callback) {
    var left = window.innerWidth / 2;
    var top = window.innerHeight / 2;
    var selection = window.getSelection();
    if (0 < selection.rangeCount) {
        var range = window.getSelection().getRangeAt(0);
        var dummy = document.createElement('span');
        range.insertNode(dummy);
        var off = getOffset(dummy);
        dummy.remove();
        window.getSelection().addRange(range);
        console.log(off.left + ':' + off.top);
        callback(off.left, off.top);
    }
}

function getOffset(el) {
    el = el.getBoundingClientRect();
    var off = {
        left: (el.left + el.right) / 2 + window.scrollX - 50,
        top: el.bottom + window.scrollY + 5
    };

    if (el.bottom == el.top) {
        // 行首字母选择后会出现这种情况
        off.top += 20;
    }

    return off;
}

function setPopoverPosition(left, top) {
    if (left > 0 && top > 0) {
        $('#shanbay_popover').css({
            position: 'absolute',
            left: left,
            top: top
        });
        last_position.left = left;
        last_position.top = top;
    } else {
        $('#shanbay_popover').css({
            position: 'absolute',
            left: last_position.left,
            top: last_position.top
        });

    }
}

function addNewWord(data, word_id) {
    chrome.runtime.sendMessage({method: "addWord", data: {data: data,word_id: word_id}});
}

function forgetWord(learning_id) {
    chrome.runtime.sendMessage({method: "forgetWord", data: learning_id});
}


function playAudio(audio_url) {
    chrome.runtime.sendMessage({method: "playAudio", data: {audio_url: audio_url}})
}

function getThesaurus(word) {
    //var url = "http://localhost:3001/api/v1/words/thesaurus"
    // Ji-Yuhang
    console.log("getThesaurus:",word);
    $.ajax({
        url: 'https://iamyuhang.com/api/v1/words/thesaurus/?word=' +word ,
        type: 'GET',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        /*            data: JSON.stringify({*/
        //content_type: "vocabulary",
        //id: word_id
        /*}),*/
//        data: JSON.stringify({
            ////content_type: "vocabulary",
            ////word_id: data.word_id,
            //word: word
        //}),

        success: function (data) {
            //chrome.tabs.sendMessage(tab.id, {
                //callback: 'addWord',
                //data: {msg: 'success', rsp: data.data}
            //});
            var thesaurus = data.data.thesaurus;
            var macmillan = data.data.macmillan;
            var verbal_adventages = data.data.verbal_adventages;
            var thesaurus_text =JSON.stringify(thesaurus);
            thesaurus_text = ''
            for (var adj in thesaurus)
            {
                var list_list = thesaurus[adj];
                var list_list_text = '<b>'+adj+':</b>';
                list_list_text += '<div>';
                for(var i=0; i<list_list.length; i++){
                    var list = list_list[i];
                    var list_text = '&nbsp&nbsp<b>'+i+':</b>';
                    list_text += '<span>';
                    for(var j=0; j<list.length; j++){
                        var w = list[j];
                        list_text += '<span>&nbsp;';
                        list_text += w;
                        list_text += ' </span>';

                    }
                    list_text += '</span><br/>';
                    list_list_text += list_text
                }
                list_list_text += '</div>';
//                var adj_text = '';
                //adj_text += list_list_text;
                thesaurus_text += '<p>' + list_list_text + '</p>';
            }
            $("#shanbay_popover_thesaurus").append(thesaurus_text);
            if (macmillan && macmillan.frequency) {
              var temp = 5 - macmillan.frequency;
              // if (temp < 0) temp = 0;
              var stars = '★★★★★'.slice(temp);
              var star_font = '' + stars + '';
              $("#shanbay_popover_stars").append(star_font);
            }

            if (verbal_adventages) {
              var verbal = verbal_adventages.verbal;
              var explanation = verbal_adventages.explanation;
              $("#shanbay_popover_verbal_adventages").append(explanation);
            }
            console.log('getThesaurus success', data, data.data, thesaurus, thesaurus_text,macmillan,verbal_adventages);
        },
        error: function (xhr,status, error) {
//            chrome.tabs.sendMessage(tab.id, {
                //callback: 'addWord',
                //data: {msg: 'error', rsp: {}}
            //});
            console.log('getThesaurus error',xhr,status,error);
        },
        complete: function () {
            console.log('getThesaurus complete');
        }
    });
};

function getPhrase(word, wholeText){
    //var url = "http://localhost:3001/api/v1/words/thesaurus"
    // Ji-Yuhang
    console.log("getPhrase:",word,wholeText);
    $.ajax({
        url: 'https://iamyuhang.com/api/v1/words/phrase/',
        //url: 'http://localhost:3000/api/v1/words/phrase/',
        type: 'POST',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        /*            data: JSON.stringify({*/
        //content_type: "vocabulary",
        //id: word_id
        /*}),*/
       data: JSON.stringify({
            word: word,
            whole_text: wholeText
        }),

        success: function (data) {
            //chrome.tabs.sendMessage(tab.id, {
                //callback: 'addWord',
                //data: {msg: 'success', rsp: data.data}
            //});
            //console.log("get phrase success: ",data)
            var phrase = data.data.phrase;
            $("#shanbay_popover_phrase").append(phrase);
            console.log('getPhrase success', data, phrase);
        },
        error: function (xhr,status, error) {
//            chrome.tabs.sendMessage(tab.id, {
                //callback: 'addWord',
                //data: {msg: 'error', rsp: {}}
            //});
            console.log('getPhrase error',xhr,status,error);
        },
        complete: function () {
            console.log('getPhrase complete');
        }
    });
};
function parse_html_body(){
    return;
    var html = document.body.innerHTML;
    console.log('parse_html_body');
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
            console.log('parse_html_body  success',data);
        },
        error: function (xhr,status, error) {
            console.log('parse_html_body error',xhr,status,error);
        },
        complete: function () {
            console.log('parse_html_body complete');
        }
    });
};
function traversal(node,callback){
  if(!node) return;
   //对node的处理
   if(node && node.nodeType === 3){
     console.log(node.tagName);
     callback(node);
   }
   var i = 0, childNodes = node.childNodes,item;
   for(; i < childNodes.length ; i++){
     item = childNodes[i];
     if(item){
       //递归先序遍历子节点
       traversal(item);
     }
   }
 };

function is_ancestor_contain_id(node,id) {
    if (node && node.id != id) {
        return is_ancestor_contain_id(node.parentNode,id);
    }
    if (node && node.id == id) return true
    return false;

};
