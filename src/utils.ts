export type color = [number, number, number, number];

export type palette = [color, color][];

export const createBufferFromImage = (img: HTMLImageElement) => {
	const c = document.createElement("canvas");
	c.width = img.width;
	c.height = img.height;
	const ctx = c.getContext("2d", { alpha: true });
	ctx?.drawImage(img, 0, 0);
	return ctx;
};
export const getPalette = (human: HTMLImageElement, other: HTMLImageElement) => {
	const h = createBufferFromImage(human)!.getImageData(0, 0, 32, 32).data;
	const o = createBufferFromImage(other)!.getImageData(0, 0, 32, 32).data;
	const palettes: palette = [];
	for (let i = 0; i < h.length; i += 4) {
		const color = getColor(h, i);
		const paletteExists = palettes.some(([srcColor]) =>
			compareColors(srcColor, color)
		);
		if (!paletteExists && color[0] + color[1] + color[2] !== 0) {
			palettes.push([color, getColor(o, i)]);
		}
	}
	return palettes;
};
export const getColor = (data: Uint8ClampedArray, index: number): color => [
	data[index],
	data[index + 1],
	data[index + 2],
	data[index + 3],
];
export const compareColors = (c1: color, c2: color) => {
	for (let i = 0; i < 4; i++) {
		if (c1[i] !== c2[i]) {
			return false;
		}
	}
	return true;
};
export const swapPalette = (img: HTMLImageElement, palette: palette) => {
	const src = createBufferFromImage(img)!;
	const imgdata = src.getImageData(0, 0, img.width, img.height);
	const data = imgdata.data;
	for (let i = 0; i < data.length; i += 4) {
		const color = getColor(data, i);
		const newColor = palette.find((p) => compareColors(p[0], color))?.[1];
		if (newColor) {
			data[i] = newColor[0];
			data[i + 1] = newColor[1];
			data[i + 2] = newColor[2];
			data[i + 3] = newColor[3];
		}
	}
	src.putImageData(imgdata, 0, 0);

	return src.canvas;
};
const getCoordsFromIndex = (index: number, width = 32) => {
	const realIndex = (index) / 4
	const newX = realIndex % width;
	const newY = Math.floor(realIndex / width);
	return [newX, newY];
}
export const findFirstPixel = (
	img: HTMLImageElement,
	x: number = 0,
	y: number = 0,
	_offser = 0
) => {

	const context = createBufferFromImage(img)!
	const data = context.getImageData(x, y, 32, 32).data;
	const firstPixel = data.findIndex((x) => x !== 0)
	return getCoordsFromIndex(firstPixel)
};

export const isPixelColor = (data: Uint8ClampedArray) => (index: number, offset = 0) => {
	const i = index + offset * 4
	return data[i] !== 0 && data[i + 1] !== 0 && data[i + 2] !== 0 && (data[i + 3] !== 0 || data[i + 3] !== 255)
}
export const findBodyPixel = (
	img: HTMLImageElement,
	x: number = 0,
	y: number = 0,
	_offset = 0
) => {
	const context = createBufferFromImage(img)!
	const data = context.getImageData(x, y, 32, 32).data;
	let lastIndex = 0
	const color = isPixelColor(data)
	for (let i = 0; i < data.length; i += 4) {
		if (color(i) && color(i, 1) && color(i, 2) && color(i, 32) && color(i, 33) && color(i, 34)) {
			lastIndex = i
		}
	}
	return getCoordsFromIndex(lastIndex)
}

export const findFootPixel = (
	img: HTMLImageElement,
	x: number = 0,
	y: number = 0,
	xOffset = 0
) => {
	const context = createBufferFromImage(img)!
	const data = context.getImageData(x, y, 32, 32).data;
	let lastRow = 0
	for (let y = 0; y < data.length; y += 4) {
		if (isPixelColor(data)(y)) {
			lastRow = y
		}
	}
	const lastY = getCoordsFromIndex(lastRow)[1]
	const data2 = context.getImageData(x + xOffset, y, 16, 32).data;
	let lastCoords = [0, 0]
	for (let y = 0; y < data2.length; y += 4) {
		const coord = getCoordsFromIndex(y, 16)
		if (isPixelColor(data2)(y) && coord[1] === lastY) {
			lastCoords = coord
		}
	}

	return lastCoords
}

export const pixelComparator = (path: string) => {

	if (path.includes('Shoes')) {
		return [findFootPixel, 16] as const
	}
	if (path.includes('Body')) {
		return [findBodyPixel, 32] as const
	}
	return [findFirstPixel, 32] as const

}
