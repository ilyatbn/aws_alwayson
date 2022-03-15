import { sget, sset }  from './storageapi.js';

document.addEventListener('DOMContentLoaded', function() {
    var port = chrome.extension.connect({
        name: "talk to background.js"
    });
    chrome.storage.local.get(['role_one'], function(result) {
      if (typeof result.role_one !== 'undefined') {
        $('#role1').val(result.role_one);
      };
    });
  chrome.storage.local.get(['role_two'], function(result) {
    if (typeof result.role_two !== 'undefined') {
      $('#role2').val(result.role_two);
    };
  });    
  chrome.storage.local.get(['role_three'], function(result) {
    if (typeof result.role_two !== 'undefined') {
      $('#role3').val(result.role_two);
    };    
  });
  chrome.storage.local.get(['checked'], function(result) {
    if (result.checked === '1') {
      $("#enable1").prop("checked", true);
    }
    if (result.checked === '2') {
      $("#enable2").prop("checked", true);
    };
    if (result.checked === '3') {
      $("#enable3").prop("checked", true);
    }    
  });

  $('#role1').add('#role2').add('#role3').focus(function() {
    $("#enable1").prop("checked", false);
    $("#enable2").prop("checked", false);
    $("#enable3").prop("checked", false);
    port.postMessage('synchoff');
  });
  $('#role1').focusout(function(){
    sset({'role_one':$('#role1').val()});
  });
  $('#role2').focusout(function(){
    sset({'role_two':$('#role2').val()});
  });
  $('#role3').focusout(function(){
    sset({'role_three':$('#role3').val()});
  });



  $('#sts_button').click(function() {
    console.log("sts button clicked");
  });

  //1st role
  $("#enable1").change(function() {
    if(this.checked){
      $("#enable2").prop("checked", false);
      $("#enable3").prop("checked", false);
      sset({'role':$('#role1').val()});
      sset({'checked':'1'});
      port.postMessage("syncon");
      port.onMessage.addListener(function(msg) {
        console.log("Message received from background:" + msg);
      });  
    }
    else{
      if (!$('#enable2').checked)
      {
        port.postMessage('syncoff');
      }
    }
  });

  //2nd role
  $("#enable2").change(function() {
    if(this.checked){
      $("#enable1").prop("checked", false);
      $("#enable3").prop("checked", false);
      sset({'role':$('#role2').val()});
      sset({'checked':'2'});
      port.postMessage('syncon');
      port.onMessage.addListener(function(msg) {
        console.log("Message received from background:" + msg);
      });  
    }
    else{
      if (!$('#enable1').checked)
      {
        port.postMessage('syncoff');
      }
    }
  });

  //3nd role
  $("#enable3").change(function() {
    if(this.checked){
      $("#enable1").prop("checked", false);
      $("#enable2").prop("checked", false);
      sset({'role':$('#role3').val()});
      sset({'checked':'3'});
      port.postMessage('syncon');
      port.onMessage.addListener(function(msg) {
        console.log("Message received from background:" + msg);
      });  
    }
    else{
      if (!$('#enable3').checked)
      {
        port.postMessage('syncoff');
      }
    }
  });  
}, false);
