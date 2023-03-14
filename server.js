var log = require ('./logs');

// 2022-07-12 test

let logLevels = process.env.LOGLEVELS ?? 99;
let logging = (process.env.LOGGING ?? "false") == "true";
logging = true;


if (logging) {
  log.turnLoggingOn();
  log.setMaximumIndentLevel(logLevels);

  log.log('Initializing expanded logging', log.begin);
  log.log('Expanded logging is turned on!');
  log.log(`logLevels set to: ${logLevels}`);
  log.log('Initializing expanded logging', log.end);
} else {
  console.log('Expanded logging is turned off');
}


log.log('Starting server', log.begin);

// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || '0.0.0.0';
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 8080;

log.log(`host = ${host}`);
log.log(`port = ${port}`);


// Grab the blacklist from the command-line so that we can update the blacklist without deploying
// again. CORS Anywhere is open by design, and this blacklist is not used, except for countering
// immediate abuse (e.g. denial of service). If you want to block all origins except for some,
// use originWhitelist instead.
var originBlacklist = parseEnvList(process.env.CORSANYWHERE_BLACKLIST, "CORSANYWHERE_BLACKLIST");
var originWhitelist = parseEnvList(process.env.CORSANYWHERE_WHITELIST, "CORSANYWHERE_WHITELIST");
function parseEnvList(env, envDescription) {
  log.log(`Parsing ${envDescription} env variable with the value of ${env}`, log.begin);

  let parseEnvArray = [];
  if (env) {
    parseEnvArray = env.split(',');
  }

  log.log(`parsed items`, log.begin);
  parseEnvArray.forEach(item => log.log(`${item}`));
  log.log(`parsed items`, log.end);

  log.log(`Parsing ${envDescription} env variable with the value of ${env}`, log.end);


  return parseEnvArray;
}

// Set up rate-limiting to avoid abuse of the public CORS Anywhere server.
var checkRateLimit = require('./lib/rate-limit')(process.env.CORSANYWHERE_RATELIMIT);

log.log('Starting server', log.end);


var cors_proxy = require('./lib/cors-anywhere');

log.log('Creating proxy server', log.begin);

let proxyServer = cors_proxy.createServer({
  originBlacklist: originBlacklist,
  originWhitelist: originWhitelist,
  requireHeader: ['origin', 'x-requested-with'],
  checkRateLimit: checkRateLimit,
  removeHeaders: [
    'cookie',
    'cookie2',
    // Strip Heroku-specific headers
    'x-request-start',
    'x-request-id',
    'via',
    'connect-time',
    'total-route-time',
    // Other Heroku added debug headers
    // 'x-forwarded-for',
    // 'x-forwarded-proto',
    // 'x-forwarded-port',
  ],
  redirectSameOrigin: true,
  httpProxyOptions: {
    // Do not add X-Forwarded-For, etc. headers, because Heroku already adds it.
    xfwd: false,
  },
});

log.log('Creating proxy server', log.end);

log.log('Listening for incoming request', log.begin);
proxyServer.listen(port, host, function() {
  console.log('Running CORS Anywhere on ' + host + ':' + port);

  log.log("Just an initial test");
});
log.log('Listening for incoming request', log.end);

