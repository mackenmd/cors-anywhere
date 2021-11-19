let loggingIsOn = false;
let indentLevel;
let maximumIndentLevel = 999;

let spacesPerIndentLevel = 5;

export let begin = "BEGIN";
export let end = "END";
export let indent = "indent";
export let outdent = "oudent";

let timeTracker = [];

export function turnLoggingOn() {
   loggingIsOn = true;
   
   indentLevel = 0;
}

export function setMaximumIndentLevel(maxIndentLevel) {
   maximumIndentLevel = maxIndentLevel;
}


export function turnLoggingOff() {
   loggingIsOn = false;
}


export function pauseLogging() {
   loggingIsOn = false;
}


export function resumeLogging() {
   loggingIsOn = true;
}


export function log(msg, beginOrEnd, forceOn = false) {
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

