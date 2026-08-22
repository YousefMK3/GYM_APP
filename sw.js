// service worker بسيط بدون كاش أبدًا.
// كل طلب بيروح للشبكة مباشرة، يعني ما في نسخة قديمة تنعلق بجهاز المستخدم.
// هدفه الوحيد إنه يحقق شرط "قابلية التثبيت" (installability) على متصفحات أندرويد.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // ما منسوي أي شي هون عن قصد — يعني كل طلب يروح للشبكة زي ما هو، بدون كاش.
});
