exports.union = function(a, b) {
   var obj = {};
  
   a.forEach(x => obj[x] = x);
   b.forEach(x => obj[x] = x);

   return Object.keys(obj).map(x => Number(x));
}


exports.intersection = function(a, b) {
   return a.filter(x => b.includes(x));
}


exports.arraysEqual = function(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

exports.fetchWithTimeout = (uri, options = {}, time = 5000) => {
  // Lets set up our `AbortController`, and create a request options object
  // that includes the controller's `signal` to pass to `fetch`.
  const controller = new AbortController()
  const config = { ...options, signal: controller.signal }

  // Set a timeout limit for the request using `setTimeout`. If the body
  // of this timeout is reached before the request is completed, it will
  // be cancelled.
  const timeout = setTimeout(() => {
    controller.abort()
  }, time)

  return fetch(uri, config)
    .then((response) => {
      // Because _any_ response is considered a success to `fetch`, we
      // need to manually check that the response is in the 200 range.
      // This is typically how I handle that.
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`)
      }

      return response
    })
    .catch((error) => {
      // When we abort our `fetch`, the controller conveniently throws
      // a named error, allowing us to handle them separately from
      // other errors.
      if (error.name === 'AbortError') {
        throw new Error('Response timed out')
      }

      throw new Error(error.message)
    })
}


exports.randomColor = function() {
  return '#' + 
    (function makeColorString(currentColorString) {
       currentColorString += getRandomHexDigit();
    
       return  currentColorString.length === 6
             ? currentColorString
             : makeColorString(currentColorString);
     })('');

   function getRandomHexDigit() {
      let randomNumberFrom0to15 = Math.floor(Math.random()*6) + 10; // This method is now used to make sure color is not too dark.
     
      return ConvertBase.dec2hex(randomNumberFrom0to15);
   }  
}


//  Credit for the following function goes to Faisal Salman at https://gist.github.com/faisalman/4213592
var ConvertBase = function (num) {
   return {
      from : function (baseFrom) {
         return {
            to : function (baseTo) {
               return parseInt(num, baseFrom).toString(baseTo);
            }
         };
      }
   };
};

// decimal to hexadecimal
ConvertBase.dec2hex = function (num) {
   return ConvertBase(num).from(10).to(16);
};


exports.getFlattenedPropertyList = function(obj, p = [], properties = {}) {  // p = parent list
   let property;
   
   for (property in obj) {
      if (obj.hasOwnProperty(property)) {
         if (exports.typeCheck(obj[property]) == "object") {
            let newp = [...p, property];
            properties = getFlattenedPropertyList(obj[property], newp, properties);
         }
         else {
            if (!properties[property]) {
               properties[property] = {parentLevels: p.length, p: p, getValue: getTheGetValueFunction(property)};
            }
         }
      }
   }

   return properties;
   
   function getTheGetValueFunction(property) {
      if      (p.length === 0) return (obj) => obj                                    [property];
      else if (p.length === 1) return (obj) => obj[p[0]]                              [property]; 
      else if (p.length === 2) return (obj) => obj[p[0]][p[1]]                        [property]; 
      else if (p.length === 3) return (obj) => obj[p[0]][p[1]][p[2]]                  [property]; 
      else if (p.length === 4) return (obj) => obj[p[0]][p[1]][p[2]][p[3]]            [property]; 
      else if (p.length === 5) return (obj) => obj[p[0]][p[1]][p[2]][p[3]][p[4]]      [property]; 
      else if (p.length === 6) return (obj) => obj[p[0]][p[1]][p[2]][p[3]][p[4]][p[5]][property];
      
      return (obj) => null;
   };
}


exports.typeCheck = function(value) {
   //  This function borrowed from https://www.freecodecamp.org/news/javascript-typeof-how-to-check-the-type-of-a-variable-or-object-in-js/
   const return_value = Object.prototype.toString.call(value);
   // we can also use regex to do this...
   const type = return_value.substring(
      return_value.indexOf(" ") + 1,
      return_value.indexOf("]")
   );

   return type.toLowerCase();
}


exports.cartesianProductOf = function() {
   return Array.prototype.reduce.call(arguments, function(a, b) {
      var ret = [];
      a.forEach(function(a) {
         b.forEach(function(b) {
            ret.push(a.concat([b]));
         });
      });

      return ret;
   }, [[]]);
}
   
