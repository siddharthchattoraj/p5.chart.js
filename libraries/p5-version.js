(function() {
  const requested = new URLSearchParams(window.location.search).get('p5');
  const configured = document.currentScript && document.currentScript.dataset.p5Major;
  const major = configured === '1' || configured === '2'
    ? configured
    : requested === '1' ? '1' : '2';
  const version = major === '1' ? '1.11.13' : '2.3.1';
  window.p5ChartP5Version = version;
  document.write(
    `<script src="https://cdn.jsdelivr.net/npm/p5@${version}/lib/p5.min.js"><\/script>`
  );
})();
