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
//Save options to local storage automatically
$(".txtbox").focusout(function() {
  console.log("focusout")
  let optionName = $(this).attr("id")
  let optionValue = $(this).val()
  let obj ={
    [optionName]:optionValue
  }
  storage.set(obj);
});
 
function loadOptions() {
  storage.get({organization_domain, google_spid, google_idpid, saml_provider,
    refresh_interval, session_duration, roleCount, platform}, function(props) {
      $(".txtbox").each(function() {
        $(this).val(props[$(this).prop("id")])
      })
      console.log(props)
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

$( document ).ready(loadOptions)