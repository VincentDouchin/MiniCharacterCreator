import { writable } from "svelte/store"

function createRecursiveProxy(target: any, path: string[] = [],callBack:()=>void): any {
	return new Proxy(target, {
		get(subTarget, key) {
			if (typeof subTarget[key] === 'object' && subTarget[key] !== null) {
				// If the property is an object, create a Proxy for it recursively
				return createRecursiveProxy(subTarget[key], [...path, String(key)],callBack)
			}
			return subTarget[key]
		},
		set(subTarget, key, value) {
			subTarget[key] = value
			callBack()
			return true // Indicates success
		},
		deleteProperty(subTarget, key) {
			if (key in subTarget) {
				delete subTarget[key]
				callBack()
				return true // Indicates success
			}
			return false // Property not found
		},
	})
}
export const localStorageData = <T extends any>(key: string,initialValue:T) => {
	const existingValue = localStorage.getItem(key)
	let value = existingValue?JSON.parse(existingValue) : initialValue ;
	const wrapper = {value}
	
    return createRecursiveProxy(wrapper,[],()=>{
		console.log(wrapper)
		localStorage.setItem(key,JSON.stringify(wrapper.value))
	}) as {value:T}
	
  };