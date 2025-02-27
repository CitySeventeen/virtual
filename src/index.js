/* global process */

const assert = require('assert').strict;
const {ProxyTracker} = require('proxy-tracker');

const errors = {};
errors.not_implemented = (name) =>{ return "".concat(name===undefined?"":name, ' ','virtual method is not implemented');};
errors.method_already_present = (name) =>{ return "".concat(name===undefined?"":name, ' ','virtual method is already present in class');};
errors.flag_wrong = "The flag for disabling Virtual is wrong";

function Virtual(user_class, ...list_virtual_method){
  checkVirtualArgs(user_class, list_virtual_method);
  checkIfVirtualStaticMethodsAreAlreadyPresentInClass(user_class, list_virtual_method);
  checkIfVirtualMethodsAreAlreadyPresentInClass(user_class, list_virtual_method);
  
  return classWithCheckVirtualMethod(user_class, list_virtual_method);
}
function checkVirtualArgs(user_class, list_virtual_method){
  assert(typeof user_class === 'function', 'incorrect virtual method or user_class');
  assert( list_virtual_method === undefined ||
            eachVirtualMethodIsStringOrObjectWithPropertyStatic(list_virtual_method),
          'incorrect virtual method or user_class');
}
function eachVirtualMethodIsStringOrObjectWithPropertyStatic(list_virtual_method){
  return list_virtual_method.every(met => {
                                    return typeof met === 'string' ||
                                      (typeof met === 'object' && 'static' in met && typeof met.static === 'boolean'
                                                               && 'name'   in met && typeof met.name === 'string');});
}

function checkIfVirtualStaticMethodsAreAlreadyPresentInClass(user_class, list_virtual_method){
  const list_static_virtual_methods =  returnArrayOfMethods(list_virtual_method.filter(elem => {return isStaticMethod(elem);}));
 
  for(let name_method of list_static_virtual_methods){
    assert(!(name_method in user_class), errors.method_already_present(name_method));
  }
}
function checkIfVirtualMethodsAreAlreadyPresentInClass(user_class, list_virtual_method){
  const list_virtual_methods =  returnArrayOfMethods(list_virtual_method.filter(elem => {return !isStaticMethod(elem);}));
  const user_class_with_constructor_modified = createClassWithConstructorDoesNothing(user_class);
  const instance_for_verify_methods = new user_class_with_constructor_modified();
  for(let name_method of list_virtual_methods){
    assert(!(name_method in instance_for_verify_methods), errors.method_already_present(name_method));
  }
}

function createClassWithConstructorDoesNothing(user_class){
  const new_class_without_original_constructor = function(){/* it's a constructor that does nothing*/};
  new_class_without_original_constructor.prototype = user_class.prototype;
  return new_class_without_original_constructor;
}

function classWithCheckVirtualMethod(user_class, list_virtual_method){
  const static_virtual_methods =  returnArrayOfMethods(list_virtual_method.filter(elem => {return isStaticMethod(elem);}));
  const virtual_methods_of_instance = returnArrayOfMethods(list_virtual_method.filter(elem => {return !isStaticMethod(elem);}));
  const handler_class = handlerForCheckingInClass(static_virtual_methods);
  const handler_instance = handlerForCheckingInInstance(virtual_methods_of_instance);
  return new ProxyTracker(user_class, handler_class, handler_instance);
}
function isStaticMethod(method){
  return typeof method === 'object' && method.static === true;
}
function returnArrayOfMethods(array){
  return array.map(el => {if(typeof el === 'string') return el; else if(typeof el === 'object') return el.name; else throw 'error';});
}
function handlerForCheckingInClass(list_method){
  const handler = {get: checkIfExtendedClassImplementedVirtualMethod(list_method)};
  return handler;
}
function handlerForCheckingInInstance(list_method){
  const handler = {construct: checkIfInstanceOfExtendedClassImplementedVirtualMethod(list_method)};
  return handler;
}

function checkIfExtendedClassImplementedVirtualMethod(list_virtual_method){
  return function(value, target, prop, receiver){
    if(isExtendsTrapped(prop)) return;
    for(let virtual_method of list_virtual_method){
      assert(typeof target[virtual_method] === 'function', errors.not_implemented());
    }
  };
}
function isExtendsTrapped(prop){
  if(prop === 'prototype') return true;
  else return false;
}
function checkIfInstanceOfExtendedClassImplementedVirtualMethod(list_virtual_method){
  return function(value){
    for(let virtual_method of list_virtual_method){
      assert(typeof value[virtual_method] === 'function', errors.not_implemented());
    }
  };
}




module.exports.virtual = disablingVirtual;

function disablingVirtual(arg){
  let environment = process.env.NODE_ENV;
  assert(typeof arg === 'boolean' || typeof arg === 'string', errors.flag_wrong);
  
  if(arg === true || arg === environment) return Virtual;
  else return VirtualDisabled;
}
function VirtualDisabled(user_class){
  return user_class;
}
