<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";

	import Display from "./Display.svelte";
	import type { fs } from "@tauri-apps/api";
	export let selected: { path: string; index: number }[];
	export let name: string;
	export let children: fs.FileEntry[];
	export let index = 0;
	let show = false;
	const dispatch = createEventDispatcher();
	const emitSelect = (path: string) => {
		dispatch("selected", { path, index });
	};
	const sendSelected = (event: CustomEvent) => {
		dispatch("selected", event.detail);
	};
	const isFinalDir = (entries: fs.FileEntry[]) => {
		return entries.every((entry) => !entry.children?.length);
	};
	const isImage = (entry: fs.FileEntry) => {
		return entry.name?.includes("png");
	};
</script>

<button
	on:click={() => (show = !show)}
	style="width:100%; background:hsl(0, 0%, {index * 20}%)"
	>{name.replaceAll("_", "")}</button
>

{#if show}
	<div class={isFinalDir(children) ? "grid" : "contents"}>
		{#each children as item}
			{#if isImage(item)}
				<button
					on:click={() => emitSelect(item.path)}
					class={selected.some((x) => x.path === item.path)
						? "selected"
						: ""}
					style="border:solid;border-radius:10px;padding:0"
				>
					<div>{item.name?.split(/[._]/).at(-2) ?? item.name}</div>
					<Display path={item.path} />
				</button>
			{:else if item.children?.length}
				<svelte:self
					{selected}
					name={item.name}
					on:selected={sendSelected}
					children={item.children}
					index={index + 1}
				/>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.grid {
		display: grid;
		gap: 0.3rem;
		margin: 0.3rem;
		grid-template-columns: 1fr 1fr 1fr 1fr;
	}
	.contents {
		display: contents;
	}
	.selected {
		background-color: gray;
	}
</style>
