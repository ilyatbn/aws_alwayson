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
//Save options to local storage
$(".txtbox").focusout(function() {
  let optionName = $(this).attr("id")
  let optionValue = $(this).val()
  let obj ={
    [optionName]:optionValue
  }
  storage.set(obj);
});

//Save checkboxes values to local storage
$(":checkbox").change(function() {
  let optionName = $(this).attr("id")
  let optionValue = $(this).prop("checked")
  let obj ={
    [optionName]:optionValue
  }
  storage.set(obj);
});
// Save dropdown menu options
$('select').change(function() {
  let optionName = $(this).attr("id")
  let optionValue = $(this).val()
  let obj ={
    [optionName]:optionValue
  }
  storage.set(obj);
});

function loadOptions() {
  storage.get({idp_type}, function(props) {
    $('select').each(function() {
      $(this).val(props[$(this).prop("id")])
    })
  });
  storage.get({organization_domain, google_spid, google_idpid, saml_provider,
    refresh_interval, session_duration, roleCount, platform}, function(props) {
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

