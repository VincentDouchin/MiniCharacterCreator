<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { Accordion, Card, UnstyledButton } from "@svelteuidev/core";
	import Display from "./Display.svelte";
	import type { fs } from "@tauri-apps/api";
	export let selected: { path: string; index: number }[];
	export let name: string;
	export let children: fs.FileEntry[];
	export let index = 0;

	const dispatch = createEventDispatcher();
	const emitSelect = (path: string) => {
		dispatch("selected", { path, index, name });
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

<Accordion radius="xs" variant={index === 0 ? "default" : "filled"}>
	<Accordion.Item radius="xs" value={name}>
		<div slot="control">
			{name.replaceAll("_", "")}
		</div>

		<div class={isFinalDir(children) ? "grid" : "contents"}>
			{#each children as item}
				{#if isImage(item)}
					<Card
						padding="xl"
						style="background:{selected.some(
							(x) => x.path === item.path
						)
							? 'var(--svelteui-colors-dark500)'
							: 'var(--svelteui-colors-dark700)'}"
					>
						<Card.Section first padding="xs">
							<UnstyledButton
								on:click={() => emitSelect(item.path)}
								aria-label={item.name}
							>
								<Display path={item.path} />
							</UnstyledButton>
						</Card.Section>
						<Card.Section padding="xs">
							{item.name?.split(/[._]/).at(-2) ?? item.name}
						</Card.Section>
					</Card>
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
	</Accordion.Item>
</Accordion>

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
