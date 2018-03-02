/* Copyright 2013 Chris Wilson

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
function drawBuffer( width, height, context, data ) {
  var step = Math.ceil( data.length / width );
  var amp = height / 2;
  context.fillStyle = "silver";
  context.clearRect(0,0,width,height);
  for(var i=0; i < width; i++){
      var min = 1.0;
      var max = -1.0;
      for (j=0; j<step; j++) {
          var datum = data[(i*step)+j]; 
          if (datum < min)
              min = datum;
          if (datum > max)
              max = datum;
      }
      context.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
  }
}
function playAudio(audio_url) {
  if (window.play_mp3) {
    window.play_mp3(audio_url);
  } else {
    chrome.runtime.sendMessage({method: "playAudio", data: {audio_url: audio_url}})
  }
}

/*License (MIT)

Copyright © 2013 Matt Diamond

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
documentation files (the "Software"), to deal in the Software without restriction, including without limitation 
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and 
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of 
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
DEALINGS IN THE SOFTWARE.
*/
var WorkerWorker = function(){

  var recLength = 0,
    recBuffersL = [],
    recBuffersR = [],
    sampleRate;

  this.onmessage = function(e){
    switch(e.data.command){
      case 'init':
        init(e.data.config);
        break;
      case 'record':
        record(e.data.buffer);
        break;
      case 'exportWAV':
        exportWAV(e.data.type);
        break;
      case 'exportMonoWAV':
        exportMonoWAV(e.data.type);
        break;
      case 'getBuffers':
        getBuffers();
        break;
      case 'clear':
        clear();
        break;
    }
  };

  function init(config){
    sampleRate = config.sampleRate;
  }

  function record(inputBuffer){
    recBuffersL.push(inputBuffer[0]);
    recBuffersR.push(inputBuffer[1]);
    recLength += inputBuffer[0].length;
  }

  function exportWAV(type){
    var bufferL = mergeBuffers(recBuffersL, recLength);
    var bufferR = mergeBuffers(recBuffersR, recLength);
    var interleaved = interleave(bufferL, bufferR);
    var dataview = encodeWAV(interleaved);
    var audioBlob = new Blob([dataview], { type: type });

    this.postMessage(audioBlob);
  }

  function exportMonoWAV(type){
    var bufferL = mergeBuffers(recBuffersL, recLength);
    var dataview = encodeWAV(bufferL, true);
    var audioBlob = new Blob([dataview], { type: type });

    this.postMessage(audioBlob);
  }

  function getBuffers() {
    var buffers = [];
    buffers.push( mergeBuffers(recBuffersL, recLength) );
    buffers.push( mergeBuffers(recBuffersR, recLength) );
    this.postMessage(buffers);
  }

  function clear(){
    recLength = 0;
    recBuffersL = [];
    recBuffersR = [];
  }

  function mergeBuffers(recBuffers, recLength){
    var result = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < recBuffers.length; i++){
      result.set(recBuffers[i], offset);
      offset += recBuffers[i].length;
    }
    return result;
  }

  function interleave(inputL, inputR){
    var length = inputL.length + inputR.length;
    var result = new Float32Array(length);

    var index = 0,
      inputIndex = 0;

    while (index < length){
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }

  function floatTo16BitPCM(output, offset, input){
    for (var i = 0; i < input.length; i++, offset+=2){
      var s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  function writeString(view, offset, string){
    for (var i = 0; i < string.length; i++){
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function encodeWAV(samples, mono){
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 32 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, mono?1:2, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 4, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
  }
};


/*License (MIT)

Copyright © 2013 Matt Diamond

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
documentation files (the "Software"), to deal in the Software without restriction, including without limitation 
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and 
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of 
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
DEALINGS IN THE SOFTWARE.
*/

(function(window){
  var blob = new Blob(['('+WorkerWorker.toString()+')()'], {type: 'application/javascript'})
  var WORKER_PATH = URL.createObjectURL(blob);

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    if(!this.context.createScriptProcessor){
       this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    } else {
       this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
    }
   
    var worker = new Worker(config.workerPath || WORKER_PATH);
    // var worker = new Worker(WorkerWorker);

    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate
      }
    });
    var recording = false,
      currCallback;

    this.node.onaudioprocess = function(e){
      if (!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: [
          e.inputBuffer.getChannelData(0),
          e.inputBuffer.getChannelData(1)
        ]
      });
    }

    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    }

    this.record = function(){
      recording = true;
    }

    this.stop = function(){
      recording = false;
    }

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
    }

    this.getBuffers = function(cb) {
      // console.log("this.getBuffers", cb);
      currCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffers' })
    }

    this.exportWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type
      });
    }

    this.exportMonoWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportMonoWAV',
        type: type
      });
    }

    worker.onmessage = function(e){
      var blob = e.data;
      currCallback(blob);
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
  };

  Recorder.setupDownload = function(blob, filename){
    console.log("Recorder.setupDownload",blob, filename);
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.getElementById("record_save");
    link.href = url;
    link.download = filename || 'output.wav';
    console.log('link,url', link);
    var word = $('#current-learning-word').text();
    console.log('current-learning-word', word);
    if (word){
      chrome.runtime.sendMessage({method: "iamyuhang_token"}, function(response){
        console.log("sendMessage iamyuhang_token", response);
        var wav_name = `${_.uniqueId()}_${word}.wav`;
        var formData = new FormData();
        formData.append('word', word);
        formData.append('encoding', 'LINEAR16');
        formData.append('sample_rate', 44100);
        formData.append('language', 'en-US');
        formData.append('token', iamyuhang_user().authentication_token);
        formData.append('file', blob, wav_name);
  
        $.ajax({
            type:'POST',
            // url: 'http://localhost:3000/api/v1/words/word_audios/',
            url: HOST_NAME+'/api/v1/words/word_audios/',
            processData: false,
            contentType: false,
            async: false,
            cache: false,
            data : formData,
            
            success: function (data) {
              console.log('post word_audios  success',data);
              if (data.word_audio.file.url){
                playAudio(data.word_audio.file.url);
              }
              get_word_audios(word);

            },
            error: function (xhr,status, error) {
                console.log('post word_audios error',xhr,status,error);
            },
            complete: function () {
                //console.log('post word_audios complete');
            }
        });
      });

     
      // $.ajax({
      //   // url: 'http://localhost:3000/api/v1/words/parse_html/',
      //   url: HOST_NAME+'/api/v1/words/parse_html/',
      //   type: 'POST',
      //   dataType: 'JSON',
      //   contentType: "application/json; charset=utf-8",
      //   data: JSON.stringify({
      //       //token: token_obj.value
      //       html: html
      //   }),

      //   success: function (data) {
      //       console.log('parse_html_body  success',data);
           
      //   },
      //   error: function (xhr,status, error) {
      //       console.log('parse_html_body error',xhr,status,error);
      //   },
      //   complete: function () {
      //       //console.log('parse_html_body complete');
      //   }
      // });
    }
  }

  window.Recorder = Recorder;

})(window);




window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = new AudioContext();
var audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null;
var rafID = null;
var analyserContext = null;
var canvasWidth, canvasHeight;
var recIndex = 0;

/* TODO:

- offer mono option
- "Monitor input" switch
*/

function saveAudio() {
    // audioRecorder.exportWAV( doneEncoding );
    // could get mono instead by saying
    audioRecorder.exportMonoWAV( doneEncoding );
}

function gotBuffers( buffers ) {
  console.log("gotBuffers",buffers);

    var canvas = document.getElementById( "wavedisplay" );

    drawBuffer( canvas.width, canvas.height, canvas.getContext('2d'), buffers[0] );

    // the ONLY time gotBuffers is called is right after a new recording is completed - 
    // so here's where we should set up the download.
    console.log("audioRecorder.exportMonoWAV");
    audioRecorder.exportMonoWAV( doneEncoding );
}

function doneEncoding( blob ) {
    Recorder.setupDownload( blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav" );
    recIndex++;
}

function toggleRecording( e ) {
  console.log("toggleRecording",e);
    if (e.classList.contains("recording")) {
        // stop recording
        console.log("stop recording");

        audioRecorder.stop();
        e.classList.remove("recording");
        audioRecorder.getBuffers( gotBuffers );
    } else {
        // start recording
        console.log("start recording");

        if (!audioRecorder)
            return;
        e.classList.add("recording");
        audioRecorder.clear();
        audioRecorder.record();
    }
}

function convertToMono( input ) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);

    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
}

function cancelAnalyserUpdates() {
    window.cancelAnimationFrame( rafID );
    rafID = null;
}

function updateAnalysers(time) {
    if (!analyserContext) {
        var canvas = document.getElementById("analyser");
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        analyserContext = canvas.getContext('2d');
    }

    // analyzer draw code here
    {
        var SPACING = 3;
        var BAR_WIDTH = 1;
        var numBars = Math.round(canvasWidth / SPACING);
        var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

        analyserNode.getByteFrequencyData(freqByteData); 

        analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
        analyserContext.fillStyle = '#F6D565';
        analyserContext.lineCap = 'round';
        var multiplier = analyserNode.frequencyBinCount / numBars;

        // Draw rectangle for each frequency bin.
        for (var i = 0; i < numBars; ++i) {
            var magnitude = 0;
            var offset = Math.floor( i * multiplier );
            // gotta sum/average the block, or we miss narrow-bandwidth spikes
            for (var j = 0; j< multiplier; j++)
                magnitude += freqByteData[offset + j];
            magnitude = magnitude / multiplier;
            var magnitude2 = freqByteData[i * multiplier];
            analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);
        }
    }
    
    rafID = window.requestAnimationFrame( updateAnalysers );
}

function toggleMono() {
    if (audioInput != realAudioInput) {
        audioInput.disconnect();
        realAudioInput.disconnect();
        audioInput = realAudioInput;
    } else {
        realAudioInput.disconnect();
        audioInput = convertToMono( realAudioInput );
    }

    audioInput.connect(inputPoint);
}

function gotStream(stream) {
    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

//    audioInput = convertToMono( input );

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );

    audioRecorder = new Recorder( inputPoint );

    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    inputPoint.connect( zeroGain );
    zeroGain.connect( audioContext.destination );
    updateAnalysers();
}
function get_word_audios(word){
  if (word){
    chrome.runtime.sendMessage({method: "iamyuhang_token"}, function(response){
      // console.log("sendMessage iamyuhang_token", response);
      var token = iamyuhang_user().authentication_token || response.token;
  
      $.ajax({
        url: HOST_NAME+`/api/v1/words/word_audios/?token=${token}&word=${word}`,
        // url: `http://localhost:3000/api/v1/words/word_audios/?token=${token}&word=${word}`,
        type: 'GET',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        /*            data: JSON.stringify({*/
        //content_type: "vocabulary",
        //id: word_id
        /*}),*/
      //  data: JSON.stringify({
      //       word: word,
      //       token: token 
      //   }),
    
        success: function (data) {
          console.log(' get_word_audios success', data);

            var word_audios = data.word_audios;
            //"{"id":2,"user_id":1,"word_id":6098,"content":"alcohol",
            // "file":{"url":"http://localhost:3000/uploads/word_audio/file/2/blob"},
            // "encoding":"WAV","sample_rate":44100,"language":"en-US","created_at":"2018-02-27T12:37:02.354+08:00","updated_at":"2018-02-27T12:37:02.354+08:00"
            // }"
            var score_html = 
            `
            <ol id='word_audio_file_list'>
            ${_.join(_.map(word_audios, function(obj){
              var date = new Date(obj.created_at);
              var date_str = date.toLocaleString();
              var google_results = obj.google_cloud_speech_results;
              var transcript_score = _.join(_.map(google_results, function(result){
                var result_class = (result.transcript.toLowerCase() == obj.content) ? 'google_cloud_speech_result_success' : 'google_cloud_speech_result_error' ;
                return `<span class='google_cloud_speech_result ${result_class}'> ${result.transcript}&nbsp;${result.confidence * 100}</span>`;
              }),'');
              // transcript
              var random_score = transcript_score || '0';//_.random(100.0);
              return `<li >${random_score} | <button class='word_audio_file' href='${obj.file.url}'>Play</button> | ${date_str}</li>`
            }), '')}
            </ol>
            `
            if (document.getElementById('word_audio_file_list')) {
              $('#word_audio_file_list').remove();
              $('body').append(score_html);

            } else {
              $('body').append(score_html);
            }

            $('.word_audio_file').on('click', function(){
              // console.log('.word_audio_file, onclick', this);
              var audio_url = $(this).attr('href');
              // if (window.play_mp3) {
                // window.play_mp3(audio_url);
              // } else {
                playAudio(audio_url);
              // }
              // this.p
            });
        },
        error: function (xhr,status, error) {
            console.log('get_word_audios error',xhr,status,error);
        },
        complete: function () {
            console.log('get_word_audios complete');
        }
    });
    });
  }
 
};
function initAudio() {

  let popover_html = 
  `<div id="record_div"><div id="viz">
    <canvas id="analyser" width="200" height="100"></canvas>
    <canvas id="wavedisplay" width="200" height="100"></canvas>
</div>
<div id="controls">
    <img id="record" src="${chrome.extension.getURL('images/mic128.png')}" onclick="toggleRecording(this);" >
    <a id="record_save" href="#"><img src="${chrome.extension.getURL('images/save.svg')}"></a>
</div></div>`;
// onclick="toggleRecording(this);"
  // style="display: none;"
  $('body').append(popover_html);
  $('#record').on('click', function(){
    console.log('#record, onclick', this);
    toggleRecording(this);
  });
  $('#wavedisplay').on('click', function(){
    console.log('#wavedisplay, onclick', this);
    var audio_url = $('#record_save').attr('href');
    if (window.play_mp3) {
      window.play_mp3(audio_url);
    } else {
      playAudio(audio_url);
    }
  });
  
  
  $(document).on("DOMNodeInserted", '#learning_word a#show_cn_df', function () {
    // TODO 改变在线搜索的触发条件
    if($('#learning_word .word h1.content').length>0) {
        var word = $('#current-learning-word').text();
        console.log('word changed', word );
        get_word_audios(word);
        // searchOnline();
    }
  });
  $('#current-learning-word').on('change',function(e){
    var word = $('#current-learning-word').text();
    console.log('word changed',e, word );

  });

  var canDownH = true;
  $(document).keydown(function(e){
    if (!canDownH) return;
    if (!audioRecorder) return;
    var word = $('#current-learning-word').text();
    if (!word) return;
    // console.log(String.fromCharCode(e.keyCode) + " keydown", e);
    var keyCode = String.fromCharCode(e.keyCode);
    if (canDownH && keyCode == 'H'){
      canDownH = false;
      $('#record').addClass('recording');
      // start recording
      console.log("start recording");
      audioRecorder.clear();
      audioRecorder.record();
    }
  });  
  $(document).keyup(function(e){  
    // console.log(String.fromCharCode(e.keyCode) + " keyup", e);
    if (!audioRecorder) return;
    var word = $('#current-learning-word').text();
    if (!word) return;
    var keyCode = String.fromCharCode(e.keyCode);
    if (keyCode == 'H'){
      $('#record').removeClass('recording');
      console.log("stop recording");
      audioRecorder.stop();
      audioRecorder.getBuffers( gotBuffers );
      canDownH = true;
    }
  });  
        if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (!navigator.cancelAnimationFrame)
            navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
        if (!navigator.requestAnimationFrame)
            navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

    navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
}

window.addEventListener('load', initAudio );

// $(function () {
//   console.log("begin recorder.js")
//   // success callback when requesting audio input stream
//   function gotStream(stream) {
//     console.log("gotStream", stream);

//     window.AudioContext = window.AudioContext || window.webkitAudioContext;
//     var audioContext = new AudioContext();

//     // Create an AudioNode from the stream.
//     var mediaStreamSource = audioContext.createMediaStreamSource( stream );

//     // Connect it to the destination to hear yourself (or any other node for processing!)
//     // mediaStreamSource.connect( audioContext.destination );
//     console.log("audioContext", audioContext);

//   }
//   function handleError(error) {
//     console.log("handleError", error);

//     if (error.name === 'ConstraintNotSatisfiedError') {
//       errorMsg('The resolution ' + constraints.video.width.exact + 'x' +
//           constraints.video.width.exact + ' px is not supported by your device.');
//     } else if (error.name === 'PermissionDeniedError') {
//       errorMsg('Permissions have not been granted to use your camera and ' +
//         'microphone, you need to allow the page access to your devices in ' +
//         'order for the demo to work.');
//     }
//     errorMsg('getUserMedia error: ' + error.name, error);
//   }
  
//   function errorMsg(msg, error) {
//     errorElement.innerHTML += '<p>' + msg + '</p>';
//     if (typeof error !== 'undefined') {
//       console.error(error);
//     }
//   }
//   // function()
//   navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
//   navigator.getUserMedia( {audio:true, video: false}, gotStream, handleError );


// });