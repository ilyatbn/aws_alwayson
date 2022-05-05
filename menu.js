import { sget, sset }  from './storageapi.js';

document.querySelector('#go-to-options').addEventListener('click', function() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});

document.addEventListener('DOMContentLoaded', function() {
  var port = chrome.runtime.connect({
      name: "talk to background.js"
  });
  //create divs under grid-container
  chrome.storage.local.get(['roleCount'], function(result) {
    console.log(`creating divs`)
    for (let i = 0; i < parseInt(result.roleCount); i++) {
      console.log(`i:${i}`)
      jQuery('<div>', {
        id: `item${i}`,
        class: `item${i}`,
      }).appendTo('#grid');
  
      jQuery('<input>', {
        type:"text",
        value:"",
        id: `role${i}`,
        placeholder:"Role",
        class: "txtbox",
        "data-index": i
      }).appendTo(`#item${i}`);
  
      jQuery('<button>', {
        class:"button clibtn",
        id: `sts_button${i}`,
        "data-index": i,
        text: "cli"
      }).appendTo(`#item${i}`);
      
      jQuery('<label>', {
        id: `label${i}`,
        class:"switch btncls"
      }).appendTo(`#item${i}`);
  
      
      jQuery('<input>', {
        type: "checkbox",
        id: `enable${1}`,
        "data-index": i
      }).appendTo(`#label${i}`);
      
      jQuery('<span>', {
        class:"slider round"
      }).appendTo(`#label${i}`);
    }
    let height = $(document).height() / 2
    $(".options_btn").css("margin-top",height - 25);


    //get the currently checked checkbox
    chrome.storage.local.get(['checked'], function(result) {
      console.log(`getting checked:${result.checked}`)
      if (typeof result.checked !== 'undefined') {
        let dataIndex = $(`#${result.checked}`).attr("data-index");
        //find the checkbox with the same data-index as the role and set it as checked.
        $("input[id^='enable'][type='checkbox']").each(function(){
          if($(this).attr("data-index")==dataIndex){
            $(this).prop("checked", true);
          }
        })
      };
    });

    //populate the textboxes from local storage
    $("input[id^='role']").each(function(){
      let id = $(this).attr("id")
      let currentRoleTxtBox = $(this)
      console.log(`getting role data for ${id}`)
      chrome.storage.local.get([id], function(result) {
        console.log(`role data is${result[id]}`)
        if (typeof result[id] !== 'undefined') {
          currentRoleTxtBox.val(result[id]);
        };
      });
    });  
    
      
    //uncheck all checkboxes when modifying role ARNs
    $("input[id^='role']").focus(function() {
      $("input[id^='enable'][type='checkbox']").each(function(index, obj){
        $(this).prop("checked", false);
      });
      port.postMessage('syncoff');
    });
    //Save data to local storage automatically when not focusing on TxtBox
    $("input[id^='role']").focusout(function() {
      let roleName = $(this).attr("id")
      let roleValue = $(this).val()
      let obj ={
        [roleName]:roleValue
      }
      sset(obj);
    });

    //get the STS token from storage when clicking the CLI button.
    $('[id^="sts_button"]').click(function() {
      chrome.storage.local.get(['aws_sts_token'], function(result) {
        navigator.clipboard.writeText(result.aws_sts_token).then(() => {
          alert("token copied to clipboard");
        }, () => {
          alert("failed copying to clipboard");
        });
        
      });
    });
  
    //When a checkbox is changed
    $("input[id^='enable'][type='checkbox']").change(function() {
      let id = $(this).attr("id")
      let dataIndex = $(this).attr("data-index")
      if(!this.checked){
        port.postMessage('syncoff');
      }
      else {
        //uncheck other checkboxes.
        $("input[id^='enable'][type='checkbox']").each(function(){
          if($(this).attr("id")!=id){
            $(this).prop("checked", false)
          }
        })
        //find the roleTxtBox with the same data-index as the checkbox and set it's id as checked.
        $("input[id^='role']").each(function(){
          if($(this).attr("data-index")==dataIndex){
            sset({'checked':$(this).attr("id")});
          }
        })
        
        port.postMessage("syncon");
        port.onMessage.addListener(function(msg) {
          console.log("Message received from background:" + msg);
        });  

      }
    })
  })
}, false);
