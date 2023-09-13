<script lang="ts">
  import { onMount, setContext } from "svelte";
  import Display from "./Display.svelte";
  import Section from "./Section.svelte";
  import DragDropList from "./DragDropList.svelte";
  import { dialog, fs, path } from "@tauri-apps/api";

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
      if (newRoot.split("\\").at(-1) === "Generic_NPCs") {
        root = newRoot;
        localStorage.setItem("root", newRoot);
        loadTree();
      } else {
        dialog.message(
          'The source directory should be named "Generic_NPCs" and contain the animation folders'
        );
      }
    }
  };

  let selected: { path: string; index: number; name: string }[] = [];
  const select = (event: {
    detail: { path: string; index: number; name: string };
  }) => {
    if (
      selected.some(
        (x) => x.name === event.detail.name && x.path !== event.detail.path
      )
    ) {
      selected = selected.map((x) =>
        x.name === event.detail.name ? event.detail : x
      );
    } else {
      selected = selected.some((x) => x.path === event.detail.path)
        ? selected.filter((x) => x.path !== event.detail.path)
        : [...selected, event.detail];
    }
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
  let singleFile = false;

  const saveBuffer = async (
    buffer: HTMLCanvasElement,
    name: string = "NPC"
  ) => {
    if (!targetDirectory) {
      selectTargetDir();
    }
    if (targetDirectory) {
      const blob = await new Promise<Blob | null>((res) =>
        buffer.toBlob(res, "png")
      );
      if (blob) {
        await fs.writeBinaryFile(
          targetDirectory + "/" + name + ".png",
          await blob.arrayBuffer()
        );
      }
    }
  };

  const generateSprites = async () => {
    const individualSprites: HTMLCanvasElement[] = [];
    const animations = tree.filter((folder) => folder.children);
    for (const { name } of animations) {
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
      individualSprites.push(buffer);
    }
    if (singleFile) {
      const newBuffer = document.createElement("canvas");
      newBuffer.width = individualSprites.reduce(
        (acc, v) => Math.max(acc, v.width),
        0
      );
      newBuffer.height = individualSprites.reduce(
        (acc, v) => acc + v.height,
        0
      );
      let currentHeight = 0;
      const ctx = newBuffer.getContext("2d");
      for (const buffer of individualSprites) {
        ctx?.drawImage(
          buffer,
          0,
          0,
          buffer.width,
          buffer.height,
          0,
          currentHeight,
          buffer.width,
          buffer.height
        );
        currentHeight += buffer.height;
      }
      saveBuffer(newBuffer, characterName || "NPC");
    } else {
      for (let i = 0; i < individualSprites.length; i++) {
        await saveBuffer(
          individualSprites[i],
          characterName + animations[i].name
        );
      }
    }
  };
  $: idle = tree.find((x) => x.name === "Idle")?.children;
  let buttons;
</script>

<div
  style="display:grid;grid-template-columns:400px 1fr auto;height:calc(100vh - 2rem);"
>
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
    style="display:grid;grid-template-columns:1fr;grid-template-rows:1fr;height: 100%; place-items: center;"
  >
    <div
      style="display:grid;grid-template-columns:1fr;grid-template-rows:auto 1fr;"
    >
      {#each selected as img}
        {#key img.path}
          <div style="grid-area:1/1/1/1">
            <Display path={img.path} size={300} />
          </div>
        {/key}
      {/each}
    </div>
  </div>
  <div style="display:flex;flex-direction:column;height: 100%;">
    <div bind:this={buttons} style="display:grid;gap:0.2rem;font-size:0.8rem">
      <button on:click={selectDirectory}>Select source directory</button>
      <button on:click={selectTargetDir}>Select target directory</button>
      <input
        placeholder="Character name"
        style="padding:0.5rem"
        bind:value={characterName}
      />
      <div>
        <input bind:value={singleFile} type="checkbox" />
        Single file
      </div>
      <button on:click={generateSprites}>Generate sprites</button>
      <button on:click={() => (selected = [])}>Clear</button>
    </div>
    <div
      style="max-height:calc(100vh - 2rem - {buttons?.clientHeight ??
        0 + 10}px);overflow:auto"
    >
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
</div>

<style>
</style>
