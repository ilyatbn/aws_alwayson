function save_options() {
    var orgDomain = document.getElementById('organization_domain').value;
    var spid = document.getElementById('google_spid').value;
    var idpid = document.getElementById('google_idpid').value;
    var refreshInterval = document.getElementById('refresh_interval').value;
    var sessionDuration = document.getElementById('session_duration').value;
    console.log("org:"+orgDomain)
    chrome.storage.local.set({
        organization_domain: orgDomain,
        google_spid: spid,
        google_idpid: idpid,
        refresh_interval: refreshInterval,
        session_duration: sessionDuration
    }, function() {
      var status = document.getElementById('status');
      status.textContent = 'Saved.';
      setTimeout(function() {
        status.textContent = '';
      }, 2000);
    });
  }
  
function restore_options() {
    chrome.storage.local.get({
        organization_domain: '',
        google_spid: '',
        google_idpid: '',
        refresh_interval: 59,
        session_duration: 3600,
    }, function(opt) {
        document.getElementById('organization_domain').value = opt.organization_domain;
        document.getElementById('google_spid').value = opt.google_spid;
        document.getElementById('google_idpid').value = opt.google_idpid;
        document.getElementById('refresh_interval').value = opt.refresh_interval;
        document.getElementById('session_duration').value = opt.session_duration;
    });
}


$("img[id^='infoPic']").hover(function () {
  $(".layout").css("display", "block");
  $(".layout").text($(this).attr("alt")); 
}).mouseover( function(event){
  console.log(`y:${event.pageY} offset:${$(this).offset().top}`)
  var left = event.pageX - $(this).offset().left + 100;
  var top = $(this).offset().top - window.scrollY - 32 ;
  $('.layout').css({top: top,left: left});
  $(".layout").css("display", "block");
}).mouseleave( function(){
  $(".layout").css("display", "none");
  $(".layout").text(''); 
});

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
