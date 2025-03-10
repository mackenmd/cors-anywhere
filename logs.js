let loggingIsOn = false;
let indentLevel;
let maximumIndentLevel = 999;

let spacesPerIndentLevel = 5;

exports.begin = "BEGIN";
exports.end = "END";
exports.indent = "indent";
exports.outdent = "oudent";

let begin = "BEGIN";
let end = "END";
let indent = "indent";
let outdent = "oudent";


let timeTracker = [];

exports.turnLoggingOn = function () {
   loggingIsOn = true;
   
   indentLevel = 0;
}

exports.setMaximumIndentLevel  = function (maxIndentLevel) {
   maximumIndentLevel = maxIndentLevel;
}


exports.turnLoggingOff = function () {
   loggingIsOn = false;
}


exports.pauseLogging =  function () {
   loggingIsOn = false;
}


exports.resumeLogging = function () {
   loggingIsOn = true;
}


exports.log = function (msg, beginOrEnd, forceOn = false) {
   let loggingStatus = loggingIsOn;
   
   if (forceOn) {
      turnLoggingOn()
   }
   
   if (!loggingIsOn) {
      return;
   }   
   
   
   let prefix = "";
   let sufix = "";
   
   
   if (beginOrEnd === end && indentLevel > 0) {
      indentLevel -= 1;
   }
   
   let indentPadding = " ".repeat(indentLevel * spacesPerIndentLevel);
   
   if (beginOrEnd === begin) {
      indentLevel += 1;

      prefix = "BEG: ";
      
      let timedEvent = timeTracker.find(x => x.eventToTrack === msg);
      
      if (timedEvent) {
         timedEvent.timestamp = Date.now();
      } else {
         timeTracker.push({"eventToTrack" : msg, "timestamp": Date.now()});  
      }
   }
   
   if (beginOrEnd === end) {
      prefix = "END: ";
      
      let timedEvent = timeTracker.find(x => x.eventToTrack === msg);
      
      if (timedEvent) {
         let elapsedMilliseconds = Date.now() - timedEvent.timestamp;
         
         sufix = `${"\t".repeat(indentLevel + 1)}${elapsedMilliseconds}`        
      }
   }
      
   if (indentLevel <= maximumIndentLevel) {
      console.log(indentPadding + prefix, msg, sufix);
   }
   
   if (forceOn && loggingStatus !== loggingIsOn) {
      turnLoggingOff()
   }
}

