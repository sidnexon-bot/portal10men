self.addEventListener('fetch', function(event) {
  // přeskoč OneSignal API requesty
  if(event.request.url.includes('onesignal.com/api')) return;
  event.respondWith(fetch(event.request));
});

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
