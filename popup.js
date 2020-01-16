chrome.runtime.onMessage.addListener(function (request, sender) {
  if (request.action == "getSource") {
    console.log(request.source);
    //message.innerHTML = request.source;
    message.innerHTML = request.source;
  }
});

function onWindowLoad() {

  var message = document.querySelector('#message');

  chrome.tabs.executeScript(null, {
    file: "getPageContent.js"
  }, function () {
    // If you try and inject into an extensions page or the webstore/NTP you'll get an error
    if (chrome.runtime.lastError) {
      message.innerText = 'There was an error injecting script : \n' + chrome.runtime.lastError.message;
    }
  });

}

window.onload = onWindowLoad;