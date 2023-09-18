<script lang="ts">
  import { onMount, setContext } from "svelte";
  import Display from "./Display.svelte";
  import Section from "./Section.svelte";
  import DragDropList from "./DragDropList.svelte";
  import { dialog, fs } from "@tauri-apps/api";
  import { localStorageData } from "./localStorageData";
  let tree: fs.FileEntry[] = [];
  let weapons: fs.FileEntry[] = [];
  const selected = localStorageData<
    { path: string; index: number; name: string }[]
  >("selected", []);
  let singleFile = false;
  const characterName = localStorageData("characterName", "");
  const root = localStorageData("root", "");
  const targetDirectory = localStorageData("targetDir", "");
  const weaponsDir = localStorageData("weaponsDir", "");

  const loadTree = async () => {
    tree = await fs.readDir(root.value, { recursive: true });
  };

  const loadWeapons = async () => {
    const loadedWeapons = await fs.readDir(weaponsDir.value, {
      recursive: true,
    });
    weapons = loadedWeapons.map((x) => {
      if (x.name?.includes("Swing")) {
        const newChildren = x.children?.map((c) => {
          if (c.name?.includes(".png")) {
            return {
              name: c.name.split(/[._]/).at(-2),
              children: [
                { name: c.name + "_f.png", path: c.path },
                { name: c.name + "_b.png", path: c.path },
              ],
            };
          }
          return c;
        }) as fs.FileEntry[];

        return { ...x, children: newChildren };
      }
      return x;
    });
  };
  onMount(async () => {
    if (!tree.length && root.value) {
      loadTree();
    }
    if (!weapons.length && weaponsDir.value) {
      loadWeapons();
    }
  });
  const selectDirectory = async () => {
    const newRoot = await dialog.open({
      directory: true,
      multiple: false,
      recursive: true,
    });
    if (newRoot && typeof newRoot === "string") {
      if (newRoot.split("\\").at(-1) === "Generic_NPCs") {
        root.value = newRoot;
        loadTree();
      } else {
        dialog.message(
          'The source directory should be named "Generic_NPCs" and contain the animation folders'
        );
      }
    }
  };
  const selectWeaponsDir = async () => {
    const dir = await dialog.open({
      directory: true,
      multiple: false,
    });
    if (dir && typeof dir === "string") {
      weaponsDir.value = dir;
      loadWeapons();
    }
  };
  const selectTargetDir = async () => {
    const newTargetDir = await dialog.open({
      directory: true,
      multiple: false,
    });
    if (newTargetDir && typeof newTargetDir === "string") {
      targetDirectory.value = newTargetDir;
    }
  };

  const select = (event: {
    detail: { path: string; index: number; name: string };
  }) => {
    if (
      selected.value.some(
        (x) => x.name === event.detail.name && x.path !== event.detail.path
      )
    ) {
      selected.value = selected.value.map((x) =>
        x.name === event.detail.name ? event.detail : x
      );
    } else {
      selected.value = selected.value.some((x) => x.path === event.detail.path)
        ? selected.value.filter((x) => x.path !== event.detail.path)
        : [...selected.value, event.detail];
    }
  };
  const sortList = (ev: CustomEvent) => {
    selected.value = ev.detail;
  };
  setContext("selected", selected);

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
          targetDirectory.value + "/" + name + ".png",
          await blob.arrayBuffer()
        );
      }
    }
  };
  const loadImageFromPath = (path: string) => {
    return new Promise<HTMLImageElement>(async (res) => {
      const content = await fs.readBinaryFile(path);
      const blob = new Blob([content.buffer], { type: "image/png" });
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => res(img);
    });
  };
  const findFirstPixel = (
    img: HTMLImageElement,
    x: number = 0,
    y: number = 0
  ) => {
    const buffer = document.createElement("canvas");
    buffer.width = img.width;
    buffer.height = img.height;
    const context = buffer.getContext("2d", { alpha: true })!;
    context.drawImage(img, 0, 0, img.width, img.height);
    const data = context.getImageData(x, y, 32, 32).data;
    const firstPixel = (data.findIndex((x) => x !== 0) + 1) / 4;
    const newX = firstPixel % 32;
    const newY = Math.floor(firstPixel / 32);
    return [newX, newY];
  };
  const findCorrespondingHuman = async () => {
    const humanWalk = tree
      ?.find((x) => x?.name === "Walk")
      ?.children?.find((x) => x?.name === "_Characters")
      ?.children?.find((x) => x?.name === "Human")
      ?.children?.find((x) => x.name && x.name.includes("white"));
    return await loadImageFromPath(humanWalk!.path);
  };

  const createBufferFromImage = (img: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d", { alpha: true });
    ctx?.drawImage(img, 0, 0);
    return ctx;
  };
  type color = [number, number, number, number];
  const compareColors = (c1: color, c2: color) => {
    for (let i = 0; i < 4; i++) {
      if (c1[i] !== c2[i]) {
        return false;
      }
    }
    return true;
  };
  const getColor = (data: Uint8ClampedArray, index: number): color => [
    data[index],
    data[index + 1],
    data[index + 2],
    data[index + 3],
  ];
  type palette = [color, color][];
  const getPalette = (human: HTMLImageElement, other: HTMLImageElement) => {
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
  const swapPalette = (img: HTMLImageElement, palette: palette) => {
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
  const getWeaponAnimations = async (
    folder: fs.FileEntry,
    name: string,
    images: HTMLImageElement[],
    palette: palette,
    characterIndex: number
  ) => {
    const character = folder?.children?.find((x) => x.name === "_Characters");
    const weapon = folder?.children?.find((x) => x.name === name);
    const selectedCharacter = await loadImageFromPath(
      character?.children?.find((x) => x.name?.includes("human"))?.path!
    );
    const characterPaletteSwapped = swapPalette(selectedCharacter, palette);
    const front = await loadImageFromPath(
      weapon?.children?.find((x) => x.name?.split(/[_.]/).at(-2) === "f")?.path!
    );
    const back = await loadImageFromPath(
      weapon?.children?.find((x) => x.name?.split(/[_.]/).at(-2) === "b")?.path!
    );
    const buffer = document.createElement("canvas");
    buffer.width = selectedCharacter.width;
    buffer.height = selectedCharacter.height;
    const ctx = buffer.getContext("2d", { alpha: true });
    ctx?.drawImage(back, 0, 0);
    ctx?.drawImage(characterPaletteSwapped, 0, 0);
    for (let i = 1; i < images.length; i++) {
      const img = images[i];
      for (let x = 0; x < buffer.width; x += 32) {
        for (let y = 0; y < buffer.height; y += 32) {
          const [imgX, imgY] = findFirstPixel(images[characterIndex], 0, y);
          const [offsetX, offsetY] = findFirstPixel(selectedCharacter, x, y);
          const newX = x + offsetX - imgX;
          const newY = y + offsetY - imgY;
          if (offsetX + offsetY != 0) {
            ctx?.drawImage(img, 0, y, 32, 32, newX, newY, 32, 32);
          }
        }
      }
    }
    ctx?.drawImage(front, 0, 0);
    return ctx;
  };
  const generateSprites = async () => {
    const individualSprites: HTMLCanvasElement[] = [];
    const animations = tree.filter((folder) => folder.children);
    if (!selected.value.some((x) => x.path.includes("_Character"))) {
      return dialog.message(
        "at least one base character is needed to generate the animations"
      );
    }
    for (const { name } of animations) {
      if (!name) return;
      const buffer = document.createElement("canvas");
      buffer.width = 0;
      buffer.height = 0;
      const ctx = buffer.getContext("2d", { alpha: true })!;
      ctx.imageSmoothingEnabled = false;

      const images: HTMLImageElement[] = [];
      for (const { path } of selected.value) {
        images.push(await loadImageFromPath(path.replaceAll("Idle", name)));
      }
      for (const img of images) {
        buffer.width ||= img.width;
        buffer.height ||= img.height;
        ctx?.drawImage(img, 0, 0, img.width, img.height);
      }
      if (name === "Walk" && weapons.length) {
        for (const weapon of selectedWeapons.value) {
          const humanWalk = await findCorrespondingHuman();
          const characterIndex = selected.value.findIndex((x) =>
            x.path.includes("_Character")
          );
          const palette = getPalette(humanWalk, images[characterIndex]);
          const anim = await getWeaponAnimations(
            weapons.find((f) => f.children?.some((c) => c.name === weapon))!,
            weapon,
            images,
            palette,
            characterIndex
          );
          saveBuffer(anim!.canvas, characterName.value + weapon);

          const chargedFolder = weapons
            ?.find((x) => x.name && x.name.includes("arged"))
            ?.children?.find((f) => {
              return f.children?.some((c) => c.name === weapon);
            });
          if (chargedFolder) {
            const animCharged = await getWeaponAnimations(
              chargedFolder,
              weapon,
              images,
              palette,
              characterIndex
            );
            saveBuffer(
              animCharged!.canvas,
              characterName.value + weapon + "Charged"
            );
          }
        }
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
      saveBuffer(newBuffer, characterName.value || "NPC");
    } else {
      for (let i = 0; i < individualSprites.length; i++) {
        await saveBuffer(
          individualSprites[i],
          characterName.value + animations[i].name
        );
      }
    }
  };
  $: idle = tree.find((x) => x.name === "Idle")?.children;
  let buttons;
  let weaponsShown: string[] = [];
  const selectAttackCategory = (name?: string) => {
    if (name) {
      weaponsShown = weaponsShown.includes(name)
        ? weaponsShown.filter((x) => x !== name)
        : [...weaponsShown, name];
    }
  };
  const getWeaponsEntries = (folders: fs.FileEntry[]) => {
    return folders.filter((f) => "children" in f && !f.name?.includes("_"));
  };
  const selectedWeapons = localStorageData<string[]>("weaponsSelected", []);
  const selectWeapon = (name?: string) => {
    if (name) {
      selectedWeapons.value = selectedWeapons.value.includes(name)
        ? selectedWeapons.value.filter((x) => x !== name)
        : [...selectedWeapons.value, name];
    }
  };
</script>

<div
  style="display:grid;grid-template-columns:400px 1fr auto auto;gap:1rem;height:calc(100vh - 2rem);"
>
  <div
    style="max-height: 100%; overflow: auto;display:flex;flex-direction:column;gap:0.2rem"
  >
    {#if idle}
      {#each idle as { name, children }}
        {#if children && name}
          <Section
            {name}
            {children}
            on:selected={select}
            selected={selected.value}
          />
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
      {#each selected.value as img}
        {#key img.path}
          <div style="grid-area:1/1/1/1">
            <Display path={img.path} size={300} />
          </div>
        {/key}
      {/each}
    </div>
  </div>
  <div style="display:flex;flex-direction:column;height: 100%;font-size:0.8rem">
    <div bind:this={buttons} style="display:grid;gap:0.2rem;">
      <button
        on:click={selectDirectory}
        style="background:{root.value ? '' : 'red'}"
        >Select source directory<br />(Generic_NPCs)</button
      >
      <button
        on:click={selectTargetDir}
        style="background:{targetDirectory.value ? '' : 'red'}"
        >Select target directory</button
      >
      <input
        placeholder="Character name"
        style="padding:0.5rem"
        bind:value={characterName.value}
      />
      <div>
        <input bind:value={singleFile} type="checkbox" />
        Single file
      </div>
      <button on:click={generateSprites}>Generate sprites</button>
      <button on:click={() => (selected.value = [])}>Clear</button>
    </div>
    <div
      style="max-height:calc(100vh - 2rem - {buttons?.clientHeight ??
        0 + 10}px);overflow:auto"
    >
      <DragDropList
        list={selected.value}
        let:item
        key="path"
        on:sort={sortList}
      >
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
  <div style="font-size:0.8rem;display:flex;gap:0.5rem;flex-direction:column">
    <button
      on:click={selectWeaponsDir}
      style="background:{weaponsDir.value ? '' : 'red'}"
      >Select source directory<br />(Weapons)</button
    >
    {#each weapons.filter((x) => !x.name?.includes("harged")) as { name, children }}
      <button
        on:click={() => selectAttackCategory(name)}
        style="background:hsl(0, 0%, 0%);color:{children?.some(
          (w) => w.name && selectedWeapons.value.includes(w.name)
        )
          ? '#33cc33'
          : ''}">{name?.replaceAll("_", " ")}</button
      >
      {#if name && children && weaponsShown.includes(name)}
        {#each getWeaponsEntries(children) as weapon}
          <button
            style="background:hsl(0, 0%, 20%);color:{weapon.name &&
            selectedWeapons.value.includes(weapon.name)
              ? '#33cc33'
              : ''}"
            on:click={() => selectWeapon(weapon.name)}
            >{weapon.name}
          </button>
        {/each}
      {/if}
    {/each}
  </div>
</div>

<style>
</style>
