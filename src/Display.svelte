<script lang="ts">
	import { fs } from "@tauri-apps/api";
	import { getContext, onMount } from "svelte";
	export let path: string;
	export let size: number = 64;
	let canvas: HTMLCanvasElement;

	onMount(async () => {
		const content = await fs.readBinaryFile(path);
		const blob = new Blob([content.buffer], { type: "image/png" });
		const ctx = canvas.getContext("2d");
		const img = new Image();
		img.src = URL.createObjectURL(blob);
		img.onload = () => {
			ctx?.drawImage(img, 10, 10, 12, 12, 0, 0, 12, 12);
		};
	});
</script>

<canvas
	width="12"
	height="12"
	style="image-rendering:pixelated;width:{size}px;height:{size}px;"
	bind:this={canvas}
/>
