const targetDomain = 'chat.openai.com';
const proxyDomain = 'chatgpt.jasonzhou.com';

function rewriteHeaders(e) {
  let headers = e.responseHeaders;
  for (let header of headers) {
    if (header.name.toLowerCase() === 'content-security-policy') {
      header.value = header.value.replace(targetDomain, proxyDomain);
    }
  }
  return { responseHeaders: headers };
}

browser.webRequest.onHeadersReceived.addListener(
  rewriteHeaders,
  { urls: [`*://${targetDomain}/*`] },
  ['blocking', 'responseHeaders']
);

async function fetchAndReplace(requestDetails) {
  const url = new URL(requestDetails.url);

  if (url.hostname === targetDomain) {
    url.hostname = proxyDomain;
    const response = await fetch(url.href, {
      method: requestDetails.method,
      headers: requestDetails.requestHeaders
    });
    const responseBody = await response.text();

    const blob = new Blob([responseBody.replace(new RegExp(proxyDomain, 'g'), targetDomain)], { type: response.headers.get('Content-Type') });
    return {
      redirectUrl: URL.createObjectURL(blob)
    };
  }
}

browser.webRequest.onBeforeRequest.addListener(
  fetchAndReplace,
  { urls: [`*://${targetDomain}/*`] },
  ['blocking', 'requestHeaders']
);
