<script lang="ts">
	import { fs } from "@tauri-apps/api";
	import { getContext, onMount } from "svelte";
	import { loadImageFromPath } from "./loadImages";
	export let path: string;
	export let size: number = 64;
	let canvas: HTMLCanvasElement;

	onMount(async () => {
		const img = await loadImageFromPath(path);
		const ctx = canvas.getContext("2d");
		ctx?.drawImage(img, 10, 10, 12, 12, 0, 0, 12, 12);
	});
</script>

<canvas
	width="12"
	height="12"
	style="image-rendering:pixelated;width:{size}px;height:{size}px;"
	bind:this={canvas}
/>
