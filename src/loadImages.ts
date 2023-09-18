import {  fs } from "@tauri-apps/api";
const images:Record<string,HTMLImageElement> = {}
  export const loadImageFromPath = (path: string) => {
    if(images[path]) return images[path]
	return new Promise<HTMLImageElement>(async (res) => {
      const content = await fs.readBinaryFile(path);
      const blob = new Blob([content.buffer], { type: "image/png" });
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
		images[path] = img
		res(img)
	};
    });
  };