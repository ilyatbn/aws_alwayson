const storage = getApi().storage.local
//default values for options. 
var defaults = {organization_domain: '', google_spid: '', google_idpid: '',
saml_provider: 'gsuite', refresh_interval: 59, session_duration: 3600, 
platform: getPlatform(), clientupdate: false, idp_type: 'google',
refresh_interval_sso: 360, awssso_subdomain: '', saml_idp_domain: '',
sso_tab_visible: "true"
}

function getApi() {
  if (typeof chrome !== "undefined") {
    if (typeof browser !== "undefined") {
      return browser;
    } else {
      return chrome;
    }
  }
}

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

function setStsButton(item, props) {
  if(props.last_msg.includes('err')){
      $(item).css("background-image","url(/img/err.png)");
      $(item).css("visibility","visible");
      $(item).css("pointer-events","none");
      $("#msg").text(props.last_msg_detail);
    } else {
      $(item).css("visibility","visible");
    }
}

function setConsoleButton(item, props) {
  if(props.last_msg.includes('err')){
      $(item).css("visibility","hidden");
      $(item).css("pointer-events","none");
    } else {
      $(item).css("visibility","visible");
    }
}

function populateCheckboxesAndButtons(props){
  if (typeof props.checked !== 'undefined') {
    //get the currently checked checkbox
    let dataIndex = $(`#${props.checked}`).attr("data-index");
    //find the checkbox with the same data-index as the role and set it as checked.
    $(`input[id^='enable'][type='checkbox'][data-index=${dataIndex}]`).each(function(){
      $(this).prop("checked", true);
    });
    if (props.idp_type==="awssso") {
      // in aws sso, we enable all sso and console buttons..
      $(`[id^='sts_button']`).each(function(){
        setStsButton(this, props)
      });
      $(`[id^='console_btn']`).each(function(){
        setConsoleButton(this, props)
      });
    }
    else {  
      //enable the relevant sts button if something is already checked.
      $(`[id^='sts_button'][data-index=${dataIndex}]`).each(function(){
        setStsButton(this, props)
      });
    }
  }
  
  //if autofill is enabled make all textboxes readonly
  if(props.autofill==1) {
    $('#autofill_btn').css({"background-color":"#ff5400","--enabled":1})
  }
};

async function exportStsToClipboard(platform, credentials) {
  let stsCommand
  switch (platform.toLowerCase()) {
    case 'windows':
    case 'win32':
        stsCommand = "set"
        break;
    default:
        stsCommand = "export"
  }
  let stscli = [
    `${stsCommand} AWS_ACCESS_KEY_ID=${credentials.awsAccessKeyId||credentials.accessKeyId}`,
    `${stsCommand} AWS_SECRET_ACCESS_KEY=${credentials.awsSecretAccessKey||credentials.secretAccessKey}`,
    `${stsCommand} AWS_SESSION_TOKEN=${credentials.awsSessionToken||credentials.sessionToken}`,
    `${stsCommand} AWS_SESSION_EXPIRATION=${credentials.awsExpiration||credentials.expiration}`,
  ]
  navigator.clipboard.writeText(stscli.join("&&")).then(() => {
    alert("token copied to clipboard");
  }, () => {
    alert("failed copying to clipboard");
  });
}

async function refreshRolesBackend(){
  let port = chrome.runtime.connect({
    name: "talk to background.js"
  });       
  port.postMessage('role_refresh');
  port.onMessage.addListener(function(msg) {
    if (msg=='roles_refreshed'){
      location.reload();
    } else if (msg.includes('err')) {
      storage.get(['last_msg_detail'], function(result){
        $("#msg").text(result.last_msg_detail);
      })            
    } else {
      console.log("Service worker response:" + msg);
    }
  });  
}

async function buildMenu(props){
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
    
    jQuery('<button>', {
      class:"button console_btn",
      id: `console_btn${i}`,
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
}

function getPlatform(){
  let platform = navigator?.userAgentData?.platform || navigator?.platform || 'unknown'
  return platform
}

async function main(){
  let props = await storage.get(null)
  //set default values if undefined or empty
  Object.keys(defaults).forEach(function(item) {
    if(!(item in props) || props[item]===undefined || props[item]===""){
      storage.set({[item]: defaults[item]})
    }
  })
  //need to refresh it again..
  props = await storage.get(null)
  if(props.roleCount===undefined){
    storage.set({'roleCount':1})
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
      refreshRolesBackend()
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
  $('[id^="console_btn"]').click(async function() {
    let index = $(this).attr("data-index")

    // in aws sso, clicking the cli command fetches the data dynamically.
    if (props.idp_type==="awssso") {
      let accountId = props[`role${index}_acc`]
      let role = props[`role${index}_name`]
      let targetUrl = `https://perception-point.awsapps.com/start/#/console?account_id=${accountId}&role_name=${role}`
      getApi().tabs.create({ url: targetUrl, active: true })
    }
  });
  $('[id^="sts_button"]').click(async function() {
    let index = $(this).attr("data-index")

    // in aws sso, clicking the cli command fetches the data dynamically.
    if (props.idp_type==="awssso") {
      let accountId = props[`role${index}_acc`]
      let role = props[`role${index}_name`]
      let region = props.amz_rgn
      let headers=props.amz_hdr
      let baseUrl = `https://portal.sso.${region}.amazonaws.com/federation/credentials?account_id=${accountId}&role_name=${role}`

      const credsResponse = await fetch(baseUrl, {
        method: "GET",
        headers: headers
      });
      const creds = await credsResponse.json();
      if (credsResponse.ok) {
        exportStsToClipboard(props.platform, creds.roleCredentials)
        // console.log(creds.roleCredentials)
      }
      else {
        console.log(`response from federation endpoint was not ok, ${creds.message}`)
        refreshRolesBackend()
      }
    }
    else {
      if ($(`#enable${index}`).prop("checked")){
        storage.get(["platform","awsAccessKeyId","awsSecretAccessKey","awsSessionToken","awsExpiration"], function(data) {
          exportStsToClipboard(data.platform, data)
      });
      }
    }
});
  //Action when a checkbox is changed
  $("input[id^='enable'][type='checkbox']").change(function() {
    $("#msg").text("");
    let id = $(this).attr("id")
    let dataIndex = $(this).attr("data-index")
    if (props.idp_type==="awssso") {
      // in aws sso we do not hide anything since they are all available.
    }
    else{
      // hide all sts buttons
      $("[id^='sts_button']").each(function(){
          $(this).css("visibility","hidden");
      })
    }
    if(!this.checked){
        let port = chrome.runtime.connect({
          name: "talk to background.js"
        });         
        port.postMessage('refreshoff');
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
        //if sts fetch went fine enable the cli button.
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
