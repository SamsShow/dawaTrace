"use strict";exports.id=268,exports.ids=[268],exports.modules={58268:(a,b,c)=>{function d(a){return JSON.stringify(a).replace("<","\\u003c").replace(">","\\u003e").replace("&","\\u0026").replace("'","\\u0027")}c.d(b,{ApolloServerPluginLandingPageLocalDefault:()=>h,ApolloServerPluginLandingPageProductionDefault:()=>i});var e=c(92601),f=c(83295),g=c(90080);function h(a={}){let{version:b,__internal_apolloStudioEnv__:c,...d}={embed:!0,...a};return k(b,{isProd:!1,apolloStudioEnv:c,...d})}function i(a={}){let{version:b,__internal_apolloStudioEnv__:c,...d}=a;return k(b,{isProd:!0,apolloStudioEnv:c,...d})}let j=(a,b,c,d)=>{let e=JSON.stringify(encodeURIComponent(JSON.stringify(b)));return`
 <div class="fallback">
  <h1>Welcome to Apollo Server</h1>
  <p>The full landing page cannot be loaded; it appears that you might be offline.</p>
</div>
<script nonce="${d}">window.landingPage = ${e};</script>
<script nonce="${d}" src="https://apollo-server-landing-page.cdn.apollographql.com/${encodeURIComponent(a)}/static/js/main.js?runtime=${c}"></script>`};function k(a,b){let c=a??"v3",h=a??"v2",i=a??"_latest",k=`@apollo/server@${e.T}`;return{__internal_installed_implicitly__:!1,serverWillStart:async a=>(b.precomputedNonce&&a.logger.warn("The `precomputedNonce` landing page configuration option is deprecated. Removing this option is strictly an improvement to Apollo Server's landing page Content Security Policy (CSP) implementation for preventing XSS attacks."),{async renderLandingPage(){let a=encodeURIComponent(i);return{html:async function(){let e=b.precomputedNonce??(0,f.createHash)("sha256").update((0,g.A)()).digest("hex"),l=`script-src 'self' 'nonce-${e}' https://apollo-server-landing-page.cdn.apollographql.com https://embeddable-sandbox.cdn.apollographql.com https://embeddable-explorer.cdn.apollographql.com`,m=`style-src 'nonce-${e}' https://apollo-server-landing-page.cdn.apollographql.com https://embeddable-sandbox.cdn.apollographql.com https://embeddable-explorer.cdn.apollographql.com https://fonts.googleapis.com`;return`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${l}; ${m}; img-src https://apollo-server-landing-page.cdn.apollographql.com; manifest-src https://apollo-server-landing-page.cdn.apollographql.com; frame-src https://explorer.embed.apollographql.com https://sandbox.embed.apollographql.com https://embed.apollo.local:3000" />
    <link
      rel="icon"
      href="https://apollo-server-landing-page.cdn.apollographql.com/${a}/assets/favicon.png"
    />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro&display=swap"
      rel="stylesheet"
    />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Apollo server landing page" />
    <link
      rel="apple-touch-icon"
      href="https://apollo-server-landing-page.cdn.apollographql.com/${a}/assets/favicon.png"
    />
    <link
      rel="manifest"
      href="https://apollo-server-landing-page.cdn.apollographql.com/${a}/manifest.json"
    />
    <title>Apollo Server</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="react-root">
      <style nonce=${e}>
        body {
          margin: 0;
          overflow-x: hidden;
          overflow-y: hidden;
        }
        .fallback {
          opacity: 0;
          animation: fadeIn 1s 1s;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
          padding: 1em;
        }
        @keyframes fadeIn {
          0% {opacity:0;}
          100% {opacity:1; }
        }
      </style>
    ${b.embed?"graphRef"in b&&b.graphRef?((a,b,c,e)=>{let f={displayOptions:{},persistExplorerState:!1,runTelemetry:!0,..."boolean"==typeof b.embed?{}:b.embed},g={graphRef:b.graphRef,target:"#embeddableExplorer",initialState:{..."document"in b||"headers"in b||"variables"in b?{document:b.document,headers:b.headers,variables:b.variables}:{},..."collectionId"in b?{collectionId:b.collectionId,operationId:b.operationId}:{},displayOptions:{...f.displayOptions}},persistExplorerState:f.persistExplorerState,includeCookies:b.includeCookies,runtime:c,runTelemetry:f.runTelemetry,allowDynamicStyles:!1};return`
<div class="fallback">
  <h1>Welcome to Apollo Server</h1>
  <p>Apollo Explorer cannot be loaded; it appears that you might be offline.</p>
</div>
<style nonce=${e}>
  iframe {
    background-color: white;
    height: 100%;
    width: 100%;
    border: none;
  }
  #embeddableExplorer {
    width: 100vw;
    height: 100vh;
    position: absolute;
    top: 0;
  }
</style>
<div id="embeddableExplorer"></div>
<script nonce="${e}" src="https://embeddable-explorer.cdn.apollographql.com/${encodeURIComponent(a)}/embeddable-explorer.umd.production.min.js?runtime=${encodeURIComponent(c)}"></script>
<script nonce="${e}">
  var endpointUrl = window.location.href;
  var embeddedExplorerConfig = ${d(g)};
  new window.EmbeddedExplorer({
    ...embeddedExplorerConfig,
    endpointUrl,
  });
</script>
`})(c,b,k,e):!("graphRef"in b)?((a,b,c,e)=>{let f={runTelemetry:!0,endpointIsEditable:!1,initialState:{},..."boolean"==typeof b.embed?{}:b.embed??{}},g={target:"#embeddableSandbox",initialState:{..."document"in b||"headers"in b||"variables"in b?{document:b.document,variables:b.variables,headers:b.headers}:{},..."collectionId"in b?{collectionId:b.collectionId,operationId:b.operationId}:{},includeCookies:b.includeCookies,...f.initialState},hideCookieToggle:!1,endpointIsEditable:f.endpointIsEditable,runtime:c,runTelemetry:f.runTelemetry,allowDynamicStyles:!1};return`
<div class="fallback">
  <h1>Welcome to Apollo Server</h1>
  <p>Apollo Sandbox cannot be loaded; it appears that you might be offline.</p>
</div>
<style nonce=${e}>
  iframe {
    background-color: white;
    height: 100%;
    width: 100%;
    border: none;
  }
  #embeddableSandbox {
    width: 100vw;
    height: 100vh;
    position: absolute;
    top: 0;
  }
</style>
<div id="embeddableSandbox"></div>
<script nonce="${e}" src="https://embeddable-sandbox.cdn.apollographql.com/${encodeURIComponent(a)}/embeddable-sandbox.umd.production.min.js?runtime=${encodeURIComponent(c)}"></script>
<script nonce="${e}">
  var initialEndpoint = window.location.href;
  var embeddedSandboxConfig = ${d(g)};
  new window.EmbeddedSandbox(
    {
      ...embeddedSandboxConfig,
      initialEndpoint,
    }
  );
</script>
`})(h,b,k,e):j(i,b,k,e):j(i,b,k,e)}
    </div>
  </body>
</html>
          `}}}})}}},90080:(a,b,c)=>{c.d(b,{A:()=>j});var d=c(55511),e=c.n(d);let f={randomUUID:e().randomUUID},g=new Uint8Array(256),h=g.length,i=[];for(let a=0;a<256;++a)i.push((a+256).toString(16).slice(1));let j=function(a,b,c){if(f.randomUUID&&!b&&!a)return f.randomUUID();let d=(a=a||{}).random||(a.rng||function(){return h>g.length-16&&(e().randomFillSync(g),h=0),g.slice(h,h+=16)})();if(d[6]=15&d[6]|64,d[8]=63&d[8]|128,b){c=c||0;for(let a=0;a<16;++a)b[c+a]=d[a];return b}return function(a,b=0){return i[a[b+0]]+i[a[b+1]]+i[a[b+2]]+i[a[b+3]]+"-"+i[a[b+4]]+i[a[b+5]]+"-"+i[a[b+6]]+i[a[b+7]]+"-"+i[a[b+8]]+i[a[b+9]]+"-"+i[a[b+10]]+i[a[b+11]]+i[a[b+12]]+i[a[b+13]]+i[a[b+14]]+i[a[b+15]]}(d)}},92601:(a,b,c)=>{c.d(b,{T:()=>d});let d="4.13.0"}};