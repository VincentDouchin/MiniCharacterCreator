<script lang="ts">
  import { onMount, setContext } from "svelte";
  import Display from "./Display.svelte";
  import Section from "./Section.svelte";
  import DragDropList from "./DragDropList.svelte";
  import { dialog, fs } from "@tauri-apps/api";

  let tree: fs.FileEntry[] = [];
  let root = "";
  let targetDirectory = "";
  const loadTree = async () => {
    tree = await fs.readDir(root, { recursive: true });
  };

  let oldSelected: { path: string; index: number }[] = [];
  $: if (selected !== oldSelected && selected.length) {
    localStorage.setItem("character", JSON.stringify(selected));
    oldSelected = selected;
  }
  onMount(async () => {
    const localCharacter = localStorage.getItem("character");
    if (localCharacter) {
      selected = JSON.parse(localCharacter);
    }
    const localCharacterName = localStorage.getItem("characterName");
    if (localCharacterName) {
      characterName = localCharacterName;
    }
    const existingRoot = localStorage.getItem("root");
    if (!existingRoot) {
      await selectDirectory();
    } else {
      root = existingRoot;
    }
    const existingTarget = localStorage.getItem("targetDir");
    if (existingTarget) {
      targetDirectory = existingTarget;
    }
    if (!tree.length && root) {
      loadTree();
    }
    fs.BaseDirectory.AppLocalData;
  });
  const selectDirectory = async () => {
    const newRoot = await dialog.open({
      directory: true,
      multiple: false,
      recursive: true,
    });
    if (newRoot && typeof newRoot === "string") {
      root = newRoot;
      localStorage.setItem("root", newRoot);
      loadTree();
    }
  };

  let selected: { path: string; index: number }[] = [];
  const select = (event: { detail: { path: string; index: number } }) => {
    selected = selected.some((x) => x.path === event.detail.path)
      ? selected.filter((x) => x.path !== event.detail.path)
      : [...selected, event.detail];
  };
  const sortList = (ev: CustomEvent) => {
    selected = ev.detail;
  };
  setContext("selected", selected);
  let oldCharacterName = "";
  let characterName = "";
  $: if (oldCharacterName != characterName && characterName) {
    localStorage.setItem("characterName", characterName);
    oldCharacterName = characterName;
  }
  const selectTargetDir = async () => {
    const newTargetDir = await dialog.open({
      directory: true,
      multiple: false,
    });
    if (newTargetDir && typeof newTargetDir === "string") {
      targetDirectory = newTargetDir;
      localStorage.setItem("targetDir", targetDirectory);
    }
  };
  const generateSprites = async () => {
    for (const { name } of tree.filter((folder) => folder.children)) {
      if (!name) return;
      const buffer = document.createElement("canvas");
      buffer.width = 0;
      buffer.height = 0;
      const ctx = buffer.getContext("2d", { alpha: true })!;
      ctx.imageSmoothingEnabled = false;
      const images = await Promise.all(
        selected.map(({ path }) => {
          return new Promise<HTMLImageElement>(async (res) => {
            const content = await fs.readBinaryFile(
              path.replaceAll("Idle", name)
            );
            const blob = new Blob([content.buffer], { type: "image/png" });
            const img = new Image();
            img.src = URL.createObjectURL(blob);

            img.onload = () => res(img);
          });
        })
      );
      for (const img of images) {
        buffer.width ||= img.width;
        buffer.height ||= img.height;
        ctx?.drawImage(img, 0, 0, img.width, img.height);
      }
      if (!targetDirectory) {
        selectTargetDir();
      }
      if (targetDirectory) {
        const blob = await new Promise<Blob | null>((res) =>
          buffer.toBlob(res, "png")
        );
        if (blob) {
          await fs.writeBinaryFile(
            targetDirectory + "/" + characterName + name + ".png",
            await blob.arrayBuffer()
          );
        }
      }
    }
  };
  $: idle = tree.find((x) => x.name === "Idle")?.children;
</script>

<div style="display:grid;grid-template-columns:400px 1fr auto;">
  <div
    style="max-height: 100%; overflow: auto;display:flex;flex-direction:column;gap:0.2rem"
  >
    {#if idle}
      {#each idle as { name, children }}
        {#if children && name}
          <Section {name} {children} on:selected={select} {selected} />
        {/if}
      {/each}
    {/if}
  </div>
  <div
    style="display:grid;grid-template-columns:1fr;grid-template-rows:1fr;height: 100vh; place-items: center;"
  >
    {#each selected as img}
      {#key img.path}
        <div style="grid-area:1/1/1/1">
          <Display path={img.path} size={300} />
        </div>
      {/key}
    {/each}
  </div>
  <div style="display:flex;flex-direction:column">
    <button on:click={selectDirectory}>Select directory</button>
    <button on:click={selectTargetDir}>Select target directory</button>
    <input
      placeholder="Character name"
      style="padding:0.5rem"
      bind:value={characterName}
    />
    <button on:click={generateSprites}>Generate sprites</button>
    <DragDropList list={selected} let:item key="path" on:sort={sortList}>
      <div style="display:grid;place-items:center">
        <Display path={item.path} />
        <button
          on:click={() => select({ detail: item })}
          style="font-size:0.8rem">Remove</button
        >
      </div>
    </DragDropList>
  </div>
</div>

<style>
</style>
