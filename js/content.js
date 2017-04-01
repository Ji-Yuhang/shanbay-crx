function search_selected_text() {
    let text = window.getSelection().toString().trim().match(/^[a-zA-Z\s']+$/);
    let anchor_node_text = window.getSelection().anchorNode.wholeText
    console.info("content.js selected " + text, anchor_node_text);

    chrome.runtime.sendMessage({
        method: 'selected_text',
        selected_text: text,
        anchor_node_text: anchor_node_text
    });
}
$(function () {
    $(document).on('dblclick', search_selected_text);
    let popover_html = '<div id="popover_html" class="popover_html" ></div>';
    // style="display: none;"
    $('body').append(popover_html);
    $("#popover_html").on('click', function () {
        $("#popover_html").css("display", "none");
    });
});
function shanbay_template(data) {
    return (
        `
        <div>
            ${data.definition}
        <div>
        `
    )
}
var mousePos;
function awesome_popver_position() {
    let w = window.innerWidth;
    let h = window.innerHeight;
    let x = mousePos.x;
    let y = mousePos.y;

    let r_diff = w - x;
    let pop_w = $("#popover_html").getBoundingClientRect().width;
    // TODO: 计算弹出窗位置
    if (r_diff < pop_w) {
        x = x - pop_w;
    }
    y = y + 10;

    return {x: x, y: y};
}
function show_shanbay(data) {
    console.log('content.js show_shanbay:', data);
    $("#popover_html").css("display", "block");

    let template = shanbay_template(data);
    $("#popover_html").html(template);

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
        default :
            sendResponse({data: [], error:'no method match'+ request.method, request:request}); // snub them.
    }
});
