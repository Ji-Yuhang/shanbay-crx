var HOST_NAME = 'https://memorysheep.com'|| 'https://iamyuhang.com'

var mousePos;
var last_shanbay_data;
var last_selected_text;
function traversal(node,callback){
    if(!node) return;
    if(node && node.hasAttribute && node.hasAttribute('al')) return;
   //对node的处理
    var i = 0, childNodes = node.childNodes,item;
    if(node && node.nodeType === 3 && childNodes.length == 0){
        //console.log(node.tagName);
        setTimeout(
            () => {callback(node)}
            , 200);
        //node.setAttribute('al', 1);
        return;
    }

   for(; i < childNodes.length ; i++){
     item = childNodes[i];
     if(item){
       //递归先序遍历子节点
        //setTimeout(
         //() => {
             traversal(item, callback);
         //}
            //)
     }
   }
 };


function search_selected_text() {
    let text = window.getSelection().toString().trim().match(/^[a-zA-Z\s']+$/);
    let anchor_node_text = window.getSelection().anchorNode.wholeText
    console.info("content.js selected " + text, anchor_node_text);
    last_selected_text = text[0];
    if (!_.isEmpty(last_selected_text)){
        last_selected_text = text[0];
    }
    console.info("content.js last_selected_text: " , last_selected_text);


    chrome.runtime.sendMessage({
        method: 'selected_text',
        selected_text: text,
        anchor_node_text: anchor_node_text
    });
}
function playAudio(audio_url) {
    chrome.runtime.sendMessage({method: "playAudio", data: {audio_url: audio_url}})
}

function replace_span(e) {
    //console.log('traversal',e);
    return
    //var html = e.innerHTML;
    var text = e.textContent;
    if (text) {
        var ws = text.match(/\w+/g);
        if(ws){
            ws.forEach((w)=>{

                var span_node = document.createElement('span');

                span_node.setAttribute('al', 1);
                //span_node.innerHTML = linkify(w);
                span_node.innerText = w + ' ';
                e.parentNode.insertBefore(span_node, e);
                //html = html.replace(w, `<span>w</span>`);
            });
            e.parentNode.removeChild(e);
        }

        //$(e).html(html);
    }
}
function do_mark_word(word){
    $('body').mark(word, {accuracy: 'complementary'});
    // console.log('mark ',word);
}
function time_out_mark_word(words, index, time){
    var word = words[index];

    if(word) do_mark_word(word);

    var nextIndex = index + 1;
    var nextWord = words[nextIndex];
    if (nextWord){
        window.setTimeout(time_out_mark_word.bind(undefined, words, nextIndex, time), time);
    }
}
function mark_words(words){
    console.log('mark mark_words ', words);

    time_out_mark_word(words, 0, 0);
}
function time_out_mark_bulk_words(chunks, index, time){
    var words = chunks[index];

    if(words) mark_words(words);

    var nextIndex = index + 1;
    var nextWords = chunks[nextIndex];
    if (nextWords){
        window.setTimeout(time_out_mark_bulk_words.bind(undefined, chunks, nextIndex, time), time);
    }
}
function mark_bulk_words(words){
    var chunks = _.chunk(words, 50);

    time_out_mark_bulk_words(chunks, 0, 2000);
}
function parse_html_body(){
    if (!document.body) return;
    var html = document.body.innerHTML;

    // console.log('parse_html_body', html);
    // return;
    //console.log('parse_html_body');
    $.ajax({
        // url: 'http://localhost:3000/api/v1/words/parse_html/',
        url: HOST_NAME+'/api/v1/words/parse_html/',
        type: 'POST',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({
            //token: token_obj.value
            html: html
        }),

        success: function (data) {
            console.log('parse_html_body  success',data);
            var collins0 = data.collins_intersection[0]['0'];
            var collins0_filtered = _.filter(collins0, function(w){
                return w.length > 2;
            });
            console.log('collins_intersection 0',collins0, collins0_filtered);
            
            var collins1 = data.collins_intersection[0]['1'];
            console.log('collins_intersection 1',collins1);
            var macmillan0 = data.macmillan_intersection[0]['1'];
            console.log('macmillan_intersection 0', macmillan0);
            
            // $('body').mark(collins1);
            // mark_words(macmillan0);
            // _.filter(collins1, )
            mark_words(collins0_filtered);
            mark_words(collins1);
            
            // var chunks = _.chunk(collins1, 50);
            // _.forEach(chunks, function(chunk_words){
            //     console.log('chunks ', chunk_words);
            //     setTimeout(function(words){
            //         mark_words(words);
            //         // for(var i=0; i<words.length; i++){
            //         //     var temp_collins1 = words[i];
            //         //     // $('body').mark(temp_collins1);
            //         //     // console.log('mark  body',temp_collins1);
            //         //     setTimeout(function(mark_word){
            //         //         console.log('setTimeout mark ',mark_word);
            //         //         $('body').mark(mark_word);
            //         //         console.log('mark ',mark_word);
            
            //         //     }, 500, temp_collins1);
            //         // }
            //     }.bind(undefined, chunk_words), 2000 );

                
            
            // })
           
           
        },
        error: function (xhr,status, error) {
            console.log('parse_html_body error',xhr,status,error);
        },
        complete: function () {
            //console.log('parse_html_body complete');
        }
    });
};
$(function () {

    traversal(document.body, replace_span);
    
    $(document).on('dblclick', search_selected_text);
    let popover_html = '<div id="popover_html" class="popover_html" ></div>';
    // style="display: none;"
    $('body').append(popover_html);
    $("#popover_html").on('click', function (e) {
        e.preventDefault();
        return false;
        // $("#popover_html").css("display", "none");
    });
    $("mark").on('hover', function(e){
        e.preventDefault();
        console.log("mark on hover",e);
        return false;
    });
    console.log('parse_html_body')
    // parse_html_body();

});
function shanbay_template(data) {
    return (
        `
        <div>
            <div class="shanbay_head">
                <div>
                    <span id="shanbay_content">
                        ${data.content}</span>
                    <span id="shanbay_pronunciation">
                        [${data.pronunciation}]
                    </span>
                    <span id="shanbay_popover_stars" style="color:#ff5400!important;">
                    </span>
                    <span>
                        <a id="shanbay_us_audio" href="#" class="speak us"><i class="icon icon-speak"></i></a>
                    </span>
                    <span id="macmillan_frequency" calss="macmillan_frequency">
                    </span>

                </div>
                    <span>
                        <button id="shanbay_add_word">添加生词</button>
                    </span>
                    <span>
                        <button id="shanbay_add_known_word">标记熟悉</button>
                    </span>
                </div>
            <div id="shanbay_definition">
                ${data.definition.split('\n').join("<br/>")}
            </div>
            <div id="thesaurus">
            </div>
            <div id="macmillan">
            </div>
            <div id="verbal_adventages">
            </div>
        <div>
        `
    )
}
function awesome_popver_position() {
    let w = window.innerWidth;
    let h = window.innerHeight;
    if (!mousePos)
        return {x: w / 2, y: h/2};
    let x = mousePos.x;
    let y = mousePos.y;

    let r_diff = w - x;
    // let pop_w = $("#popover_html").getBoundingClientRect().width;
    let pop_w = 300;
    // TODO: 计算弹出窗位置
    if (r_diff < pop_w) {
        x = x - pop_w;
    }
    y = y + 20;

    return {x: x, y: y};
}
function hide_popver() {
    $("#popover_html").css("display", "none");
}
function add_word(data) {
    console.log('content.js add_word:', data);
    chrome.runtime.sendMessage({method: "add_word", shanbay: data});
}
function add_known_word(data, selected_text) {
    console.log('content.js add_known_word:',selected_text, data);
    chrome.runtime.sendMessage({method: "add_known_word", data: {text: selected_text}});
}

function show_shanbay(data) {
    console.log('content.js show_shanbay:', data);
    last_shanbay_data = data;

    $("#popover_html").css("display", "block");

    let template = shanbay_template(data);
    $("#popover_html").html(template);
    $('#shanbay_us_audio').click(function (e) {
        e.preventDefault();
        playAudio(last_shanbay_data.us_audio);
        return false;
    });
    $('html').click(function (e) {
        //e.preventDefault();
        hide_popver();
        //return false;
    });
    $('#shanbay_add_word').click(function (e) {
        e.preventDefault();
        let text = $('#shanbay_add_word').innerText;
        if (text != '添加成功')
            add_word(last_shanbay_data);
        return false;
    });
    $('#shanbay_add_known_word').click(function (e) {
        e.preventDefault();
        let text = $('#shanbay_add_known_word').innerText;
        if (text != '添加成功')
            add_known_word(last_shanbay_data, last_selected_text);
        return false;
    });


    let pos = awesome_popver_position();
    $("#popover_html").css("left", `${pos.x}px`);
    $("#popover_html").css("top", `${pos.y}px`);
    console.log('mousePos:',mousePos, pos);
}
function on_shanbay_data(request, sender, sendResponse) {
    console.log('content.js on_shanbay_data:', request, sender);
    let shanbay = request.shanbay;
    console.log('content.js shanbay:', shanbay);
    if (shanbay.msg == 'SUCCESS') {
        show_shanbay(shanbay.data);
    }
}
function mark_hard(request, sender, sendResponse) {
    console.log('content.js mark_hard:', request, sender);
    parse_html_body();    
    
}
function on_add_word_success(request, sender, sendResponse) {
    console.log('content.js on_add_word_success:', request, sender);
    let data = request.data;
    console.log('content.js learning:', data);
    $('#shanbay_add_word').innerText='添加成功';
    $('#shanbay_add_word').remove();
    console.log('#shanbay_add_word : ', ('#shanbay_add_word').innerText);
}
function add_known_words_success(request, sender, sendResponse) {
    console.log('content.js add_known_words_success:', request, sender);
    let data = request.data;
    console.log('content.js known_words:', data);
    $('#shanbay_add_known_word').innerText='添加成功';
    //$('body').unmark(data.known_word.content);
    $('#shanbay_add_known_word').remove();
    console.log('#add_known_words_success : ', ('#add_known_words_success').innerText);
}

function on_thesaurus_data(request, sender, sendResponse) {
    console.log('content.js on_thesaurus_data:', request, sender);
// TODO: 显示不同词典的数据，抽象出通用的方法，可以显示不同的词典
    // {
    //     "status": "ok",
    //     "data": {
    //         "word": {
    //             "id": 266593,
    //             "word": "supersede",
    //             "created_at": "2016-11-28T15:01:17.590+08:00",
    //             "updated_at": "2016-11-28T15:01:17.590+08:00"
    //         },
    //         "verbal_adventages": null,
    //         "macmillan": {
    //             "id": 55686,
    //             "content": "supersede",
    //             "word_id": 266593,
    //             "html_source": "html_source",
    //             "frequency": 0,
    //             "created_at": "2016-12-03T04:55:53.490+08:00",
    //             "updated_at": "2016-12-04T11:33:38.960+08:00"
    //         },
    //         "thesaurus": {
    //             "verb": [
    //                 [
    //                     "replace",
    //                     "displace",
    //                     "oust",
    //                     "supplant",
    //                     "take the place of",
    //                     "usurp"
    //                 ]
    //             ]
    //         }
    //     }
    // };
    let data = request.data;
    let thesaurus = data.thesaurus;
    let macmillan = data.macmillan;
    let verbal_adventages = data.verbal_adventages;
    let word = data.word;
    console.log('iamyuhang_thesaurus:',word,thesaurus,macmillan,verbal_adventages);
    if (macmillan && macmillan.frequency) {
      let temp = 5 - macmillan.frequency;
      // if (temp < 0) temp = 0;
      let stars = '★★★★★'.slice(temp);
      let star_font = '' + stars + '';
      $("#macmillan_frequency").append(star_font);
    }
    if (macmillan && macmillan.html_source) {
        $("#macmillan").append(macmillan.html_source);
    }

    if (verbal_adventages) {
      let verbal = verbal_adventages.verbal;
      let explanation = verbal_adventages.explanation;
      $("#verbal_adventages").append(explanation);
    }
    if (thesaurus) {
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
        $("#thesaurus").append(thesaurus_text);
    }

};


function mouseMove(ev)
{
    Ev= ev || window.event;
    mousePos = mouseCoords(ev);
    // console.log('mousePos:',mousePos);

    // document.getElementByIdx_x("xxx").value = mousePos.x;
    // document.getElementByIdx_x("yyy").value = mousePos.y;
}
function mouseCoords(ev)
{
    if(ev.pageX || ev.pageY){
        return {x:ev.pageX, y:ev.pageY};
    }
    return {
        x:ev.clientX + document.body.scrollLeft - document.body.clientLeft,
        y:ev.clientY + document.body.scrollTop - document.body.clientTop
    };
}
document.onmousemove = mouseMove;
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("content.js received method: " + request);
    switch (request.method) {
        case 'shanbay_data':
            on_shanbay_data(request, sender, sendResponse);
            break;
        case 'add_word_success':
            on_add_word_success(request, sender, sendResponse);
            break;
        case 'add_known_words_success':
            add_known_words_success(request, sender, sendResponse);
            break;

        case 'thesaurus_data':
            on_thesaurus_data(request, sender, sendResponse);
            break;
        case 'mark_hard':
            mark_hard(request, sender, sendResponse);
            break;
        default :
            // sendResponse({data: [], error:'no method match'+ request.method, request:request}); // snub them.
    }
});
