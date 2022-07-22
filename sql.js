let log = require('./logs.js');
let utils = require('./utils.js');


exports.join = function(req) {
   log.log(`join`, log.begin);
   
   const validJoinTypes = ["Inner Link", "Inner", "Left"];

   if (!req.joinType)                                          { throw "joinType not specified" };
   if (!validJoinTypes.includes(req.joinType))                 { throw "Invalid joinType specified" };
   
   let innerJoinRequested = req.joinType.includes("Inner");
   let linkJoinRequested  = req.joinType.includes("Link");

   if (!req.leftTable)                                         { throw "leftTable not specified" };
   if (!req.rightTable)                                        { throw "rightTable not specified" };

   let leftTableRowCount  = req.leftTable.length;
   let rightTableRowCount = req.rightTable.length;
   let linkTableRowCount  = 0;
   let leftToRightJoinFuncs = [];
   let leftToLinkJoinFuncs = [];
   let linkToRightJoinFuncs = [];

   if (req.leftToRightJoinFuncs)  {
      if (!Array.isArray(req.leftToRightJoinFuncs)) { 
         throw "leftToRightJoinFuncs is not an array" 
      } else {
         req.leftToRightJoinFuncs.forEach(x => {
            if (!x instanceof Function) {
               throw "One or more leftToRightJoinFuncs is not a function" 
            }
         })
         leftToRightJoinFuncs = req.leftToRightJoinFuncs;
      }
   };

   if (req.leftToLinkJoinFuncs)  {
      if (!Array.isArray(req.leftToLinkJoinFuncs)) { 
         throw "leftToLinkJoinFuncs is not an array" 
      } else {
         req.leftToLinkJoinFuncs.forEach(x => {
            if (!x instanceof Function) {
               throw "One or more leftToLinkJoinFuncs is not a function" 
            }
         })
         leftToLinkJoinFuncs = req.leftToLinkJoinFuncs;
      }
   };

   if (req.linkToRightJoinFuncs)  {
      if (!Array.isArray(req.linkToRightJoinFuncs)) { 
         throw "linkToRightJoinFuncs is not an array" 
      } else {
         req.linkToRightJoinFuncs.forEach(x => {
            if (!x instanceof Function) {
               throw "One or more linkToRightJoinFuncs is not a function" 
            }
         })
         linkToRightJoinFuncs = req.linkToRightJoinFuncs;
      }
   };

   if (linkJoinRequested) {
      if (!req.linkTable)                                      { throw "linkTable not specified" };
      if (!req.fieldsJoiningLeftToLink)                        { throw "fieldsJoiningLeftToLink not specified" };
      if (!req.fieldsJoiningLinkToRight)                       { throw "fieldsJoiningLinkToRight not specified" };
      if (utils.typeCheck(req.fieldsJoiningLeftToLink)  !== "array") { throw "fieldsJoiningLeftToLink must be an array" }
      if (utils.typeCheck(req.fieldsJoiningLinkToRight) !== "array") { throw "fieldsJoiningLeftToLink must be an array" }
      
      linkTableRowCount  = req.linkTable.length;
   } else {
      if (!req.fieldsJoiningLeftToRight)                       { throw "fieldsJoiningLeftToRight not specified" };
      if (utils.typeCheck(req.fieldsJoiningLeftToRight) !== "array") { throw "fieldsJoiningLeftToLink must be an array" }
   }

   if (innerJoinRequested) {
      if (leftTableRowCount === 0 || rightTableRowCount === 0 || (linkJoinRequested && linkTableRowCount === 0)) {
         log.log(` left table row count: ${leftTableRowCount}` );
         log.log(`right table row count: ${rightTableRowCount}`);
         
         if (linkJoinRequested) {
            log.log(` link table row count: ${linkTableRowCount}` );
         }
         log.log(`join`, log.end);
         
         return [];
      }
   }
   
   if (req.tablesArePreSorted === undefined) {
      req.tablesArePreSorted = false;
   }
   
   if (req.propertyNameOfLeft === undefined) {
      req.propertyNameOfLeft = "";
   }
   
   if (req.propertyNameOfRight === undefined) {
      req.propertyNameOfRight = "";   
   }

   let leftProps  = {};
   let rightProps = {};
   let linkProps  = {};
   
   let compareLeftToLink;
   let compareLinkToRight;
   let compareLeftToRight;

   leftProps  = utils.getFlattenedPropertyList(req.leftTable[0]);
   rightProps = utils.getFlattenedPropertyList(req.rightTable[0]);

   if (linkJoinRequested) {
      linkProps = utils.getFlattenedPropertyList(req.linkTable[0]);
      
      compareLeftToLink  = getCompareFunction(leftProps, linkProps,  req.fieldsJoiningLeftToLink,  leftToLinkJoinFuncs);
      compareLinkToRight = getCompareFunction(linkProps, rightProps, req.fieldsJoiningLinkToRight, linkToRightJoinFuncs);
   } else {
      compareLeftToRight = getCompareFunction(leftProps, rightProps, req.fieldsJoiningLeftToRight, leftToRightJoinFuncs);
   }
   
   let newArray = [];
   
   let rightIndex = 0;
   let leftIndex  = 0;
   let linkIndex  = 0;
   
   
   switch (req.joinType) {
      case "Inner Link":
         innerLink();
         break;

      case "Inner":
         inner();
         break;

      default:
         throw "Invalid joinType";
   }
   
   log.log(`join`, log.end);
      
   return newArray;
   
   
   function getCompareFunction(aProps, bProps, compareFields, compareFunctions) {
      let a;
      let b;
      let compareResult;
      let i;

      let numberOfFieldsToCompare = compareFields.length;
      let numberOfCompareFunctions = compareFunctions.length;

      let getAValue = [];
      let getBValue = [];
      
      i = 0;

      while (i < numberOfFieldsToCompare) {
         getAValue.push(aProps[compareFields[i]].getValue);
         getBValue.push(bProps[compareFields[i]].getValue);

         ++i;
      }
      
      
      return (aObj, bObj) => {
         compareResult = 0;
         i = 0;

         while (compareResult === 0 && i < numberOfFieldsToCompare) {
            a = getAValue[i](aObj);
            b = getBValue[i](bObj);

            compareResult = a === b ? 0 : (a < b ? 1 : -1);
            
            ++i;
         }
         
         if (compareResult === 0 && numberOfCompareFunctions > 0) {
            i = 0;
            
            while (compareResult === 0 && i < numberOfCompareFunctions) {
               compareResult = compareFunctions[i](aObj, bObj);
               i++;
            }
         }
         
         return compareResult;
      }
   }

   
   function innerLink() {
      if (req.tablesArePreSorted) {
         log.log(`innerLink : pre-sorted`, log.begin);
         
         let leftIndex = 0;
         let linkIndex = 0;
         
         while (leftIndex < leftTableRowCount && rightIndex < rightTableRowCount) {
            let leftToLinkComparisonResult = compareLeftToLink(req.leftTable[leftIndex], req.linkTable[linkIndex]);
            
            while (linkIndex < linkTableRowCount && leftToLinkComparisonResult <= 0.5) {
               if (leftToLinkComparisonResult === 0) {
                  let rightObject = req.rightTable.find(z => compareLinkToRight(req.linkTable[linkIndex], z) === 0);

                  if (req.propertyNameOfRight === "") {
                     if (req.propertyNameOfLeft === "") {
                        newArray.push({                        ...req.leftTable[leftIndex], ...rightObject, ...req.linkTable[linkIndex] });
                     } else {
                        newArray.push({[req.propertyNameOfLeft] : req.leftTable[leftIndex], ...rightObject});
                     }
                  } else {
                     if (req.propertyNameOfLeft === "") {
                        newArray.push({                         ...req.leftTable[leftIndex], [req.propertyNameOfRight] : rightObject});
                     } else {
                        newArray.push({[req.propertyNameOfLeft]  : req.leftTable[leftIndex], [req.propertyNameOfRight] : rightObject});
                     }
                  }
               }
               
               ++linkIndex;
               if (linkIndex < linkTableRowCount) {
                  leftToLinkComparisonResult = compareLeftToLink(req.leftTable[leftIndex], req.linkTable[linkIndex]);
               }  
            }
            
            ++leftIndex;
         };
         log.log(`innerLink : pre-sorted`, log.end);
      }
   }

   // This does not appear to be used as of 5/10/2022
   function innerOneToMany() {
      if (req.tablesArePreSorted) {
         log.log(`innerOneToMany`, log.begin);
         
         let leftIndex = 0;
         let rightIndex = 0;
         
         while (leftIndex < leftTableRowCount && rightIndex < rightTableRowCount) {
            let leftToRightComparisonResult = compareLeftToRight(req.leftTable[leftIndex], req.rightTable[rightIndex]);
            
            while (rightIndex < rightTableRowCount && leftToRightComparisonResult <= 0) {
               if (leftToRightComparisonResult === 0) {
                  if (req.propertyNameOfRight === "") {
                     if (req.propertyNameOfLeft === "") {
                        newArray.push({                        ...req.leftTable[leftIndex], ...req.rightTable[rightIndex]});
                     } else {
                        newArray.push({[req.propertyNameOfLeft] : req.leftTable[leftIndex], ...req.rightTable[rightIndex]});
                     }
                  } else {
                     if (req.propertyNameOfLeft === "") {
                        newArray.push({                         ...req.leftTable[leftIndex], [req.propertyNameOfRight] : req.rightTable[rightIndex]});
                     } else {
                        newArray.push({[req.propertyNameOfLeft]  : req.leftTable[leftIndex], [req.propertyNameOfRight] : req.rightTable[rightIndex]});
                     }
                  }
               }
               
               ++rightIndex;
               if (rightIndex < rightTableRowCount) {
                  leftToRightComparisonResult = compareLeftToRight(req.leftTable[leftIndex], req.rightTable[rightIndex]);
               }  
            }
            
            ++leftIndex;
         };
         log.log(`innerOneToMany`, log.end);
      }
   }

   
   function inner() {
      log.log(`inner : pre-sorted`, log.begin);

      let leftIndex = 0;
      let rightIndex = 0;

      let initialRightIndexMatchingLeftVal = -1;
      let numberOfGroupFields = req.fieldsJoiningLeftToRight.length;
      let getGroupFieldValue = [];

      for (let i = 0; i < numberOfGroupFields; ++i) {
         getGroupFieldValue.push(leftProps[req.fieldsJoiningLeftToRight[i]].getValue);
      }

      let oldGroupFieldValues = {};

      while (leftIndex < leftTableRowCount && rightIndex < rightTableRowCount) {
         if (hasGroupChanged(req.leftTable[leftIndex]) || initialRightIndexMatchingLeftVal === -1) {
            saveToOldGroupFieldValues(req.leftTable[leftIndex]);
            initialRightIndexMatchingLeftVal = null;
         } else {
            if (initialRightIndexMatchingLeftVal !== null) {
               rightIndex = initialRightIndexMatchingLeftVal;
            }
         }

         let leftToRightComparisonResult = compareLeftToRight(req.leftTable[leftIndex], req.rightTable[rightIndex]);

         while (rightIndex < rightTableRowCount && leftToRightComparisonResult <= 0) {
            if (leftToRightComparisonResult === 0) {
               if (req.propertyNameOfRight === "") {
                  if (req.propertyNameOfLeft === "") {
                     newArray.push({                        ...req.leftTable[leftIndex], ...req.rightTable[rightIndex]});
                  } else {
                     newArray.push({[req.propertyNameOfLeft] : req.leftTable[leftIndex], ...req.rightTable[rightIndex]});
                  }
               } else {
                  if (req.propertyNameOfLeft === "") {
                     newArray.push({                         ...req.leftTable[leftIndex], [req.propertyNameOfRight] : req.rightTable[rightIndex]});
                  } else {
                     newArray.push({[req.propertyNameOfLeft]  : req.leftTable[leftIndex], [req.propertyNameOfRight] : req.rightTable[rightIndex]});
                  }
               }

               if (initialRightIndexMatchingLeftVal === null) {
                  initialRightIndexMatchingLeftVal = rightIndex;
               }
            }

            ++rightIndex;
            if (rightIndex < rightTableRowCount) {
               leftToRightComparisonResult = compareLeftToRight(req.leftTable[leftIndex], req.rightTable[rightIndex]);
            }  
         }

         ++leftIndex;
      };
      log.log(`inner : pre-sorted`, log.end);

      
      function hasGroupChanged(x) {
         let i = 0;
         let groupHasChanged = false;

         while (i < numberOfGroupFields && ! groupHasChanged) {
            groupHasChanged = getGroupFieldValue[i](x) !== oldGroupFieldValues[req.fieldsJoiningLeftToRight[i]];
            i += 1;
         }

         return groupHasChanged;
      }
      
      function saveToOldGroupFieldValues(x) {
         let i = 0;

         while (i < numberOfGroupFields) {
            oldGroupFieldValues[req.fieldsJoiningLeftToRight[i]] = getGroupFieldValue[i](x);
            i += 1;
         }
      }
   }

   
   
   function sss() {
      arrX.forEach(x => {
         while (y < arrYLength && arrY[y][xyJoinField] <= x[xyJoinFieldParent][xyJoinField]) {
            if (x[xyJoinFieldParent][xyJoinField] === arrY[y][xyJoinField]) {
               let zObject = arrZ.find(z => z[yzJoinFieldParent][yzJoinField] === arrY[y][yzJoinField]);

               if (nameOfZ === "") {
                  newArray.push({...x, ...zObject});
               } else {
                  newArray.push({...x, [nameOfZ] : zObject});
               }
            }
            y += 1;
         }
      });
   }
}


exports.sum2 = function(arrx, groupFields, sumField, cntField, avgField) {
   log.log(`sum2`, log.begin);
   
   if (arrx.length === 0) {
      log.log(`no records to sum`);
      
      log.log(`sum2`, log.end);
      
      return [];
   }
   
   // TODO Need to put error checking to make sure there is at least 1 record in the array

   let properties = utils.getFlattenedPropertyList(arrx[0]);

   let newArray = [];
   let count = 0;
   let sumTotal = 0;

   let oldGroupFieldValues = {};
   let oldDataValues = {};
   
   let numberOfGroupFields = groupFields.length;
   let thisIsFirstRecord = true;
   
   let getGroupFieldValue = [];
   
   for (let i = 0; i < numberOfGroupFields; ++i) {
      getGroupFieldValue.push(properties[groupFields[i]].getValue);
   }
   let getSumFieldValue = properties[sumField].getValue;
   

   arrx.forEach(x => {
      if (thisIsFirstRecord) { 
         saveToOldGroupFieldValues(x);
         saveToOldDataValues(x);
         thisIsFirstRecord = false;
      };

      if (hasGroupChanged(x)) {
         pushToArray();

         saveToOldGroupFieldValues(x);
         saveToOldDataValues(x);

         sumTotal = getSumFieldValue(x);
         count = 1;
      } else {
         sumTotal += getSumFieldValue(x);
         count += 1;
      }
   });
   
   pushToArray();
   
   log.log(`sum2`, log.end);
   
   return newArray;
   
   
   function saveToOldGroupFieldValues(x) {
      let i = 0;
      
      while (i < numberOfGroupFields) {
         oldGroupFieldValues[groupFields[i]] = getGroupFieldValue[i](x);
         i += 1;
      }
   }
   
   function saveToOldDataValues(x) {
      oldDataValues = {...x};
   }
   
   function hasGroupChanged(x) {
      let i = 0;
      let groupHasChanged = false;
      
      while (i < numberOfGroupFields && !groupHasChanged) {
         groupHasChanged = getGroupFieldValue[i](x) !== oldGroupFieldValues[groupFields[i]];
         i += 1;
      }
      return groupHasChanged;
   }
   
   function pushToArray() {
      if (cntField) {
         newArray.push({...oldDataValues, [sumField]: sumTotal, ...oldGroupFieldValues, [cntField]: count, [avgField]: Number((sumTotal / count).toFixed(3).toString())});      
      } else {
         newArray.push({...oldDataValues, [sumField]: sumTotal, ...oldGroupFieldValues});         
      }
   }
}


exports.sum3 = function(arrx, groupFields, sumFields, cntField) {
   log.log(`sum3`, log.begin);
   
   if (arrx.length === 0) {
      log.log(`no records to sum`);

      log.log(`sum3`, log.end);

      return [];
   }

   
   let numberOfGroupFields = groupFields.length;
   let numberOfSumFields   = sumFields.length;

   let properties = utils.getFlattenedPropertyList(arrx[0]);
   
   let getGroupFieldValue = [];
   let getSumFieldValue = [];
   
   for (let i = 0; i < numberOfGroupFields; ++i) {
      getGroupFieldValue.push(properties[groupFields[i]].getValue);
   }

   for (let i = 0; i < numberOfSumFields; ++i) {
      getSumFieldValue.push(properties[sumFields[i]]?.getValue ?? (() => 0));
   }

   let newArray = [];
   let count = 0;
   let sumTotal = {};
   let avgTotal = {};
   
   let oldGroupFieldValues = {};
   let oldDataValues = {};
   
   let thisIsFirstRecord = true;
   
   let sumFieldValue = 0;

   sumFields.forEach(fieldName => {
      sumTotal[fieldName + "Sum"] = 0;
   });
   

   arrx.forEach(x => {
      if (thisIsFirstRecord) { 
         saveToOldGroupFieldValues(x);
         saveToOldDataValues(x);
         thisIsFirstRecord = false;
      };

      if (hasGroupChanged(x)) {
         pushToArray();

         saveToOldGroupFieldValues(x);
         saveToOldDataValues(x);
         
         count = 1;

         sumFields.forEach((fieldName, i) => { 
            sumFieldValue = Number(getSumFieldValue[i](x));
            sumTotal[fieldName + "Sum"] = sumFieldValue;
            avgTotal[fieldName + "Avg"] = sumFieldValue;
         });
      } else {
         count += 1;

         sumFields.forEach((fieldName, i) => {
            sumFieldValue = Number(getSumFieldValue[i](x));
            sumTotal[fieldName + "Sum"] += sumFieldValue;
            avgTotal[fieldName + "Avg"]  = Number((sumTotal[fieldName + "Sum"] / count).toFixed(3).toString());
         });
      }
   });
   
   pushToArray();
   
   log.log(`sum3`, log.end);
   
   return newArray;
   
   
   function saveToOldGroupFieldValues(x) {
      let i = 0;
      
      while (i < numberOfGroupFields) {
         oldGroupFieldValues[groupFields[i]] = getGroupFieldValue[i](x);
         i += 1;
      }
   }
   
   function saveToOldDataValues(x) {
      oldDataValues = {...x};
   }
   
   function hasGroupChanged(x) {
      let i = 0;
      let groupHasChanged = false;
      
      while (i < numberOfGroupFields && !groupHasChanged) {
         groupHasChanged = getGroupFieldValue[i](x) !== oldGroupFieldValues[groupFields[i]];
         i += 1;
      }
      return groupHasChanged;
   }
   
   function pushToArray() {
      if (cntField) {
         newArray.push({...oldDataValues, ...sumTotal, ...avgTotal, ...oldGroupFieldValues, [cntField]: count, });      
      } else {
         newArray.push({...oldDataValues, ...sumTotal, ...avgTotal, ...oldGroupFieldValues});         
      }
   }
}


exports.sumYTD2 = function(arrx, groupFields, sumField, ytdField) {
   log.log(`sumYTD2`, log.begin);
   
   if (arrx.length === 0) {
      log.log(`no records to sum`);

      log.log(`sumYTD2`, log.end);

      return [];
   }

   
   let numberOfGroupFields = groupFields.length;

   let properties = utils.getFlattenedPropertyList(arrx[0]);

   let getGroupFieldValue = [];  // array of functions
   let getSumFieldValue = properties[sumField].getValue;
   
   for (let i = 0; i < numberOfGroupFields; ++i) {
      getGroupFieldValue.push(properties[groupFields[i]].getValue);
   }
   
   let newArray = [];
   let sumTotal = 0;

   let oldGroupFieldValues = {};
   let oldDataValues = {};
   
   let thisIsFirstRecord = true;

   arrx.forEach(x => {
      if (thisIsFirstRecord) { 
         saveToOldGroupFieldValues(x);
         saveToOldDataValues(x);
         thisIsFirstRecord = false;
      };

      if (hasGroupChanged(x)) {
         sumTotal =  Number(getSumFieldValue(x));
      } else {
         sumTotal += Number(getSumFieldValue(x));
      }

      saveToOldGroupFieldValues(x);
      saveToOldDataValues(x);
      
      pushToArray();
   });
   
   log.log(`sumYTD2`, log.end);
   
   return newArray;
   

   function saveToOldGroupFieldValues(x) {
      let i = 0;
      
      while (i < numberOfGroupFields) {
         oldGroupFieldValues[groupFields[i]] = getGroupFieldValue[i](x);
         i += 1;
      }
   }
   
   function saveToOldDataValues(x) {
      oldDataValues = {...x};
   }
   
   function hasGroupChanged(x) {
      let i = 0;
      let groupHasChanged = false;
      
      while (i < numberOfGroupFields && !groupHasChanged) {
         groupHasChanged = getGroupFieldValue[i](x) !== oldGroupFieldValues[groupFields[i]];
         i += 1;
      }
      return groupHasChanged;
   }
   
   function pushToArray() {
      newArray.push({...oldDataValues, [ytdField]: sumTotal, ...oldGroupFieldValues});      
   }
}


exports.rankNoTies = function(arrx, groupFields, dataFields, compareField, rankWithTiesField, rankNoTiesField) {
   log.log(`rankNoTies`, log.begin);
   
   if (arrx.length === 0) {
      log.log(`no records to rank`);

      log.log(`rankNoTies`, log.end);

      return [];
   }

   
   let properties = utils.getFlattenedPropertyList(arrx[0]);
   
   let newArray = [];

   let rankNoTies = 0;
   let rankWithTies = 0;

   let oldGroupFieldValues = {};
   let oldDataValues = {};

   let oldCompareFieldValue = 0;
   
   let numberOfGroupFields = groupFields.length;
   let numberOfDataFields = dataFields.length;
   
   let thisIsFirstRecord = true;

   let getGroupFieldValue = [];
   let getDataValue = [];
   let getCompareValue = [];
   
   for (let i = 0; i < numberOfGroupFields; ++i) {
      getGroupFieldValue.push(properties[groupFields[i]].getValue);
   }

   for (let i = 0; i < numberOfDataFields; ++i) {
      getDataValue.push(properties[dataFields[i]].getValue);
   }

   getCompareValue = properties[compareField].getValue;
   
   arrx.forEach(x => {
      if (thisIsFirstRecord || hasGroupChanged(x)) {
         rankNoTies = 0;
         rankWithTies = 0;
         oldCompareFieldValue = null;
         thisIsFirstRecord = false;
      }
      
      rankNoTies += 1;

      if (oldCompareFieldValue !== x[compareField]) {
         let difference = oldCompareFieldValue - getCompareValue(x);
         
         if (Math.abs(difference) > .10) {
            rankWithTies = rankNoTies;
            oldCompareFieldValue = getCompareValue(x);
         }
      }

      saveToOldGroupFieldValues(x);
      saveToOldDataValues(x);
      
      pushToArray();
   });
   
   log.log(`rankNoTies`, log.end);
   
   return newArray;
   
   
   function saveToOldGroupFieldValues(x) {
      let i = 0;
      
      while (i < numberOfGroupFields) {
         oldGroupFieldValues[groupFields[i]] = getGroupFieldValue[i](x);
         i += 1;
      }
   }
   
   function saveToOldDataValues(x) {
      let i = 0;
      
      while (i < numberOfDataFields) {
         oldDataValues[dataFields[i]] = getDataValue[i](x);
         i += 1;
      }
   }
   
   function hasGroupChanged(x) {
      let i = 0;
      let groupHasChanged = false;
      
      while (i < numberOfGroupFields && ! groupHasChanged) {
         groupHasChanged = getGroupFieldValue[i](x) !== oldGroupFieldValues[groupFields[i]];
         i += 1;
      }
      
      return groupHasChanged;
   }
   
   function pushToArray() {
      newArray.push({[rankWithTiesField]: rankWithTies, [rankNoTiesField]: rankNoTies, ...oldGroupFieldValues, ...oldDataValues});      
   }
}