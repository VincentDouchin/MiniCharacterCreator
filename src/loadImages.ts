import {  fs } from "@tauri-apps/api";
const images:Record<string,HTMLImageElement> = {}
export const urls :Record<string,string> = {}
export const loadImageFromPath = (path: string) => {
    if(images[path]) return images[path]
	return new Promise<HTMLImageElement>(async (res) => {
      const content = await fs.readBinaryFile(path);
      const blob = new Blob([content.buffer], { type: "image/png" });
      const img = new Image();
		const url = URL.createObjectURL(blob) 
	  img.src = url
      img.onload = () => {
		images[path] = img
		urls[path] = url
		res(img)
	};
    });
  };