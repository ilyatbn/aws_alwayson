const storage = chrome.storage.local

document.querySelector('#go-to-options').addEventListener('click', function() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});


function handleTextboxes(props){
  //populate the textboxes from local storage
  $("input[id^='role']").each(function(){
    if ($(this).prop("readonly")) {
      $(this).css("background-color","#cccccc")
    } else {
      $(this).css("background-color","#ffffff")
    }
    let id = $(this).attr("id")
    let currentRoleTxtBox = $(this)
    if (typeof props[id] !== 'undefined') {
      currentRoleTxtBox.val(props[id]);
    }
  });
};

function populateCheckboxesAndButtons(props){
  //get the currently checked checkbox
  if (typeof props.checked !== 'undefined') {
    let dataIndex = $(`#${props.checked}`).attr("data-index");
    //find the checkbox with the same data-index as the role and set it as checked.
    $(`input[id^='enable'][type='checkbox'][data-index=${dataIndex}]`).each(function(){
      $(this).prop("checked", true);
    });
    //enable the relevant sts button if something is already checked.
    $(`[id^='sts_button'][data-index=${dataIndex}]`).each(function(){
      if(props.last_msg.includes('err')){
          $(this).css("background-image","url(/img/err.png)");
          $(this).css("visibility","visible");
          $(this).css("pointer-events","none");
          $("#msg").text(props.last_msg_detail);
        } else {
          $(this).css("visibility","visible");
        }
    });
  }
  //if autofill is enabled make all textboxes readonly
  if(props.autofill==1) {
    $('#autofill_btn').css({"background-color":"#ff5400","--enabled":1})
  }
};

async function buildMenu(props){
  $("#grid").empty();
  for (let i = 0; i < parseInt(props.roleCount); i++) {
    jQuery('<div>', {
      id: `item${i}`,
      class: `item${i}`,
    }).appendTo('#grid');

    let textboxProperties = {
      type:"text",
      value:"",
      id: `role${i}`,
      placeholder:"Role",
      class: "txtbox",
      "data-index": i
    }
    //if autofill is enabled make all textboxes readonly
    if(props.autofill==1) {
      textboxProperties['readonly'] = "readonly"
      $('.txtbox').css("pointer-events","none");
    }
    jQuery('<input>', textboxProperties).appendTo(`#item${i}`);

    jQuery('<button>', {
      class:"button clibtn",
      id: `sts_button${i}`,
      "data-index": i
    }).appendTo(`#item${i}`);
    
    jQuery('<label>', {
      id: `label${i}`,
      class:"switch btncls"
    }).appendTo(`#item${i}`);

    jQuery('<input>', {
      type: "checkbox",
      id: `enable${i}`,
      "data-index": i
    }).appendTo(`#label${i}`);
    
    jQuery('<span>', {
      class:"slider round"
    }).appendTo(`#label${i}`);
  }
  handleTextboxes(props)
  populateCheckboxesAndButtons(props)
  //center the options button
  $(window).resize(function() {
    let height_bottom = Math.round($(document).height() * 0.67)
    let height_top = Math.round($(document).height() * 0.33)
    $(".options_btn").css("margin-top",height_bottom - 20);      
    $(".autofill_btn").css("margin-top",height_top - 20);      
  });
}

async function main(){
  let props = await storage.get(null)
  if(props.roleCount===undefined){
    $('#go-to-options').click()
  }
  buildMenu(props)
  $("#clibtn").hover(function () {
    alert($(this).prop("title")); 
  });
  //interation with autofill btn.
  $('#autofill_btn').click(function() {
    if($(this).css("--enabled") == 0){   
      storage.set({"autofill": 1})
      $(this).css({"background-color":"#ff5400","--enabled":1})
      let port = chrome.runtime.connect({
        name: "talk to background.js"
      });       
      port.postMessage('role_refresh');
      port.onMessage.addListener(function(msg) {
        if (msg=='roles_refreshed'){
          location.reload();
        } else if (msg.includes('err')) {
          $(`[id^='sts_button'][data-index=${dataIndex}]`).each(function(){
            $(this).css("background-image","url(/img/err.png)");
            storage.get(['last_msg_detail'], function(result){
              $("#msg").text(result.last_msg_detail);
            })
          })            
        } else {
          console.log("Service worker response:" + msg);
        }
      });  
    } else {
      storage.set({"autofill": 0})
      $(this).css({"background-color":"#4d4d4d","--enabled":0})
      location.reload();
    }
  });
  //uncheck all checkboxes when modifying role ARNs
  $("input[id^='role']").focus(function() {
    $("input[id^='enable'][type='checkbox']").each(function(index, obj){
      $(this).prop("checked", false);
    });
    let port = chrome.runtime.connect({
      name: "talk to background.js"
    });       
    port.postMessage('refreshoff');
  });
  //Save data to local storage automatically when not focusing on TxtBox
  $("input[id^='role']").focusout(function() {
    let roleName = $(this).attr("id")
    let roleValue = $(this).val()
    let obj ={
      [roleName]:roleValue
    }
    storage.set(obj);
  });
  //get the STS token from storage when clicking the CLI button.
  $('[id^="sts_button"]').click(function() {
    let index = $(this).attr("data-index")
    if ($(`#enable${index}`).prop("checked")){
      storage.get(['aws_sts_token'], function(data) {
        navigator.clipboard.writeText(data.aws_sts_token).then(() => {
          alert("token copied to clipboard");
        }, () => {
          alert("failed copying to clipboard");
        });
      });
    }
  });
  //Action when a checkbox is changed
  $("input[id^='enable'][type='checkbox']").change(function() {
    let id = $(this).attr("id")
    let dataIndex = $(this).attr("data-index")
    // hide all sts buttons
    $("[id^='sts_button']").each(function(){
        $(this).css("visibility","hidden");
    })
    if(!this.checked){
        let port = chrome.runtime.connect({
          name: "talk to background.js"
        });         
        port.postMessage('refreshoff');
        $("#msg").text("");
    }
    else {
      //uncheck other checkboxes.
      $("input[id^='enable'][type='checkbox']").each(function(){
        if($(this).attr("id")!=id){
          $(this).prop("checked", false)
        }
      })
      //enable sts loading button
      $(`[id^='sts_button'][data-index=${dataIndex}]`).each(function(){
        $(this).css("background-image","url(/img/loading.gif)");
        $(this).css("visibility","visible");
        $(this).css("pointer-events","none");
      })
      //set the roleTxtBox with the same data-index as the as checked.
      $(`input[id^='role'][data-index=${dataIndex}]`).each(function(){
          storage.set({'checked':$(this).attr("id")});
      })
      //start background service functions
      let port = chrome.runtime.connect({
        name: "talk to background.js"
      });      
      port.postMessage("refreshon");
      port.onMessage.addListener(function(msg) {
        //if sts fetch went fint enable the cli button.
        if(msg=='sts_ready') {
          $(`[id^='sts_button'][data-index=${dataIndex}]`).each(function(){
            $(this).css("background-image","url(/img/cli.png)");
            $(this).prop("title","Click to copy STS credentials to clipboard.")
            $(this).css("pointer-events","");
          })
        } else if (msg.includes('err')) {
          $(`[id^='sts_button'][data-index=${dataIndex}]`).each(function(){
            $(this).css("background-image","url(/img/err.png)");
            storage.get(['last_msg_detail'], function(result){
              $("#msg").text(result.last_msg_detail);
            })            
          })
        }
        else {
          console.log("Service worker response:" + msg);
        }
      })
    } 
  })
}
main()
