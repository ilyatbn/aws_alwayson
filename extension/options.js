const storage = getApi().storage.local

function getApi() {
  if (typeof chrome !== "undefined") {
    if (typeof browser !== "undefined") {
      return browser;
    } else {
      return chrome;
    }
  }
}


const awsSsoPermissions = {
  permissions: ["tabs", "windows"],
  origins: [
    "https://*.awsapps.com/*",
    "https://*.amazonaws.com/*"
  ]
};

async function permissionValidator(option, value) {
  let props = await storage.get(null)
  console.log(`validating opt ${option}`)
  if (option === "saml_idp_domain") {
    if (props.saml_idp_domain!=='' && props.saml_idp_domain!==value) {
      console.log(`updated idp domain, requesting permissions for ${value}`)
      const extraIdpPermission = {
        origins: [`https://${value}/*`]
        }      
      getApi().permissions.contains(extraIdpPermission, (result) => {
        if (result) {
          console.log("Permissions already granted.");
        } else {
          getApi().permissions.request(extraIdpPermission, (granted) => {
            if (granted) {
              console.log(`user granted permissions for domain ${value}`);
              return true
            } else {
              console.log(`user did not grant permissions for domain ${value}`);
              return false
            }
          });
        }
      });
    }
  }
  if (option === "idp_type") {
    if (value==="awssso") {
      console.log("enabled AWS SSO. adding new permissions")
      getApi().permissions.contains(awsSsoPermissions, (result) => {
        if (result) {
          console.log("Permissions already granted.");
        } else {
          getApi().permissions.request(awsSsoPermissions  , (granted) => {
            if (granted) {
              console.log("Permissions granted!");
              return true
            } else {
              console.log("Permissions denied.");
              return false
            }
          });
        }
      });
    }
  }
  return true
}
//Save options to local storage
$(".txtbox,select,:checkbox").focusout(async function() {
  let optionName = $(this).attr("id")
  let optionValue = $(this).val()
  let obj ={
    [optionName]:optionValue
  }
  let validated = await permissionValidator(optionName, optionValue)
  if (validated) {
    storage.set(obj);
  }
  else {
    console.log("validation did not pass..")
  }
});

// //Save checkboxes values to local storage
// $(":checkbox").change(async function() {
//   let optionName = $(this).attr("id")
//   let optionValue = $(this).prop("checked")
//   let obj ={
//     [optionName]:optionValue
//   }
//   storage.set(obj);
// });
// // Save dropdown menu options
// $('select').change(async function() {
//   let optionName = $(this).attr("id")
//   let optionValue = $(this).val()
//   let obj ={
//     [optionName]:optionValue
//   }
//   validated = await permissionValidator(optionName, optionValue)
//   if (validated) storage.set(obj);
// });

function loadOptions() {
  storage.get({idp_type,sso_tab_visible}, function(props) {
    $('select').each(function() {
      $(this).val(props[$(this).prop("id")])
    })
  });
  storage.get({organization_domain, google_spid, google_idpid, saml_provider,
    refresh_interval, session_duration, roleCount, platform, awssso_subdomain,
    refresh_interval_sso, awssso_subdomain, saml_idp_domain}, function(props) {
      $(".txtbox").each(function() {
        $(this).val(props[$(this).prop("id")])
      })
  });

  storage.get({clientupdate}, function(props) {
      $(".chkbox").each(function() {
        $(this).prop("checked",props[$(this).prop("id")])
      })
  });
}

//display help information
$("img[id^='infoPic']").hover(function () {
  $(".layout").css("display", "block");
  $(".layout").text($(this).attr("alt")); 
}).mouseover( function(event){
  var left = event.pageX - $(this).offset().left + 100;
  var top = $(this).offset().top - window.scrollY - 32 ;
  $('.layout').css({top: top,left: left});
  $(".layout").css("display", "block");
}).mouseleave( function(){
  $(".layout").css("display", "none");
  $(".layout").text(''); 
});

$('.tablinks').click(function(){
  let id  = $(this).prop("id")
  $('.grid-container').each(function() {
    if ($(this).prop("id") === id){
      $(this).css("display", "grid");
    } else {
      $(this).css("display", "none");
    }
  })  
});

$( document ).ready(loadOptions)

