let utils = require ('./utils.js');

exports.order = function (...args) {
   let compareFunctions = [];

   for (let i = 0; i < args.length; i++) {
      compareFunctions.push(processSortField(args[i]));
   }

   return (a, b) => {
      let compareValue = 0;

      compareFunctions.forEach((compareFunction) => {
         if (compareValue === 0) {
            compareValue = compareFunction(a, b);
         }
      });

      return compareValue;
   };
}


function processSortField(propWithFlags) {
   let descendingOrderRequested             = propWithFlags.toLowerCase().includes("-d");
   let caseSensitiveSort                    = propWithFlags.toLowerCase().includes("-cs");
   let convertStringToNumber                = propWithFlags.toLowerCase().includes("-n");
   let considerZeroValueToBeInfinity        = propWithFlags.toLowerCase().includes("-z");
   let performStringOffset                  = propWithFlags.toLowerCase().includes("-o");
   let convertStringToTime                  = propWithFlags.toLowerCase().includes("-t");

   // Note the flag "-x" is reserved to indicate the field is not to be reversed when the user clicks on a column twice in a row.

   let stringOffset = 0;

   if (performStringOffset) { stringOffset = Number(propWithFlags.match(/-o\[(.*)\]/)[1]); }

   let positionOfFirstDash = propWithFlags.indexOf("-");
   let prop                = positionOfFirstDash === -1 ? propWithFlags : propWithFlags.substring(0, positionOfFirstDash);

   let lessThan            = descendingOrderRequested ? 1 : -1;
   let greaterThan         = descendingOrderRequested ? -1 : 1;
   
   let haveWeSortedFirstRecord = false;
   let properties;

   let typeIsString = false;
   let typeIsNumber = false;
   
   let aVal;
   let bVal;
   
   let typeOfPropertyA;
   let typeOfPropertyB;
   
   let propertyNotFound = false;
   

   return (a, b) => {
      if (propertyNotFound) {
         return 0;
      }
      
      if (! haveWeSortedFirstRecord) {
         properties = utils.getFlattenedPropertyList(a);

         if (!properties[prop]) {
            propertyNotFound = true;
            return 0;
         }
         
         aVal = properties[prop]?.getValue(a) ?? "";
         bVal = properties[prop]?.getValue(b) ?? "";
         
         typeOfPropertyA = utils.typeCheck(aVal);
         typeOfPropertyB = utils.typeCheck(bVal);
         
         typeIsString = typeOfPropertyA === "string" && aVal !== "" && aVal !== "WD";  // Treat an empty string as a number since empty strings are used to indicate 0 to the user.
         typeIsNumber = typeOfPropertyA === "number" || aVal === "";
         
         haveWeSortedFirstRecord = true;
      } else {
         aVal = properties[prop]?.getValue(a) ?? "";
         bVal = properties[prop]?.getValue(b) ?? "";
      }

      if (caseSensitiveSort) {
         return aVal == bVal ? 0 : aVal < bVal ? lessThan : greaterThan;
      } 

      let aa, bb;

      if (convertStringToNumber) {
         aa = removeEandF(aVal);
         bb = removeEandF(bVal);

         if (considerZeroValueToBeInfinity) {
            aa = aa === "" || aa === null ? Infinity : Number(aa);
            bb = bb === "" || bb === null ? Infinity : Number(bb);
         } else {
            aa = Number(aa);
            bb = Number(bb);
         }
      } else if (convertStringToTime) {
         aa = covertStringTimeToNumberMinutes(aVal);
         bb = covertStringTimeToNumberMinutes(bVal);
      } else {
         if (typeIsString) { aa = aVal.length === 0 ? "" : aVal.toLowerCase(); } else { aa = aVal; }
         if (typeIsString) { bb = bVal.length === 0 ? "" : bVal.toLowerCase(); } else { bb = bVal; }

         if (performStringOffset) {
            aa = aa.length > stringOffset ? aa.substring(stringOffset) : "A"; 
            bb = bb.length > stringOffset ? bb.substring(stringOffset) : "A";
         }

         if (considerZeroValueToBeInfinity) {
            if (!aa) { aa = typeIsNumber ? Infinity : String.fromCharCode(255); }
            if (!bb) { bb = typeIsNumber ? Infinity : String.fromCharCode(255); }
         }
      }

      return aa === bb ? 0 : aa < bb ? lessThan : greaterThan;
   }
}

function removeEandF(word) {
   let cleansedWord = word;

   cleansedWord = cleansedWord === "E" ? "0" : cleansedWord;
   cleansedWord = cleansedWord === "F" ? "18" : cleansedWord;
   cleansedWord = cleansedWord === "Cut" ? "999" : cleansedWord;
   cleansedWord = cleansedWord === "WD" ? "9999" : cleansedWord;
   cleansedWord = cleansedWord === "DQ" ? "99999" : cleansedWord;

   return cleansedWord;
}

function covertStringTimeToNumberMinutes(str) {
   let amPos = str.indexOf("AM");
   let pmPos = str.indexOf("PM");

   if (amPos === -1 && pmPos === -1) {
      amPos = str.indexOf("A");
      pmPos = str.indexOf("P");
   }

   let colonPos = str.indexOf(":");

   let hour = Number(str.slice(0, colonPos));
   let minute = Number(str.slice(colonPos + 1, colonPos + 3));

   let timeInMinutes =
      (hour + (pmPos === -1 || hour === 12 ? 0 : 12)) * 60 + minute;

   return timeInMinutes;
}