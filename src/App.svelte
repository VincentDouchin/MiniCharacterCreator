<script lang="ts">
  import { onMount, setContext } from "svelte";
  import Display from "./Display.svelte";
  import Section from "./Section.svelte";
  import DragDropList from "./DragDropList.svelte";
  import { dialog, fs, path } from "@tauri-apps/api";
  import { localStorageData } from "./localStorageData";
  import { loadImageFromPath, overwriteImage } from "./loadImages";
  import {
    ActionIcon,
    Button,
    Card,
    Checkbox,
    Chip,
    Group,
    Input,
    Popper,
    SvelteUIProvider,
    Tabs,
    Text,
    Title,
  } from "@svelteuidev/core";
  import Fa from "svelte-fa";
  import {
    faFolderOpen,
    faFileExport,
    faFileArrowDown,
    faTrash,
    faTimes,
    faSpinner,
    faCheckCircle,
  } from "@fortawesome/free-solid-svg-icons";
  import {
    getPalette,
    swapPalette,
    type palette,
    pixelComparator,
  } from "./utils";
  import { rand } from "@svelteuidev/composables";

  const selected = localStorageData<
    { path: string; index: number; name: string }[]
  >("selected", []);

  const characterName = localStorageData("characterName", "");
  const targetDirectory = localStorageData("targetDir", "");

  let rootFolder: fs.FileEntry[] = [];
  const rootDir = localStorageData("root", "");
  let weaponsFolder: fs.FileEntry[] = [];
  const weaponsDir = localStorageData("weaponsDir", "");
  let crafting1Folder: fs.FileEntry[] = [];
  const crafting1Dir = localStorageData("crafting1", "");
  let crafting2Folder: fs.FileEntry[] = [];
  const crafting2Dir = localStorageData("crafting2", "");
  let addonsFolder: fs.FileEntry[] = [];
  const addonsDir = localStorageData("addons", "");

  const loadTree = async () => {
    rootFolder = await fs.readDir(rootDir.value, { recursive: true });
  };

  const loadWeapons = async () => {
    const loadedWeapons = await fs.readDir(weaponsDir.value, {
      recursive: true,
    });
    weaponsFolder = loadedWeapons.map((x) => {
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
  const loadCrafting1 = async () => {
    crafting1Folder = await fs.readDir(crafting1Dir.value, { recursive: true });
  };
  const loadCrafting2 = async () => {
    crafting2Folder = await fs.readDir(crafting2Dir.value, { recursive: true });
  };
  const loadAddons = async () => {
    addonsFolder = await fs.readDir(addonsDir.value, { recursive: true });
  };
  onMount(async () => {
    if (!rootFolder.length && rootDir.value) {
      loadTree();
    }
    if (!weaponsFolder.length && weaponsDir.value) {
      loadWeapons();
    }
    if (!crafting1Folder.length && crafting1Dir.value) {
      loadCrafting1();
    }
    if (!crafting2Folder.length && crafting2Dir.value) {
      loadCrafting2();
    }
    if (!addonsFolder.length && addonsDir.value) {
      loadAddons();
    }
  });

  const selectRootDirectory = async () => {
    const dir = await dialog.open({
      directory: true,
      multiple: false,
      recursive: true,
    });
    if (dir && typeof dir === "string") {
      if (dir.split("\\").at(-1) === "Generic_NPCs") {
        rootDir.value = dir;
        loadTree();
      } else {
        dialog.message(
          'The source directory is the one named "Generic_NPCs" and contain the animation folders',
        );
      }
    }
  };
  const selectWeaponsDir = async () => {
    const dir = await dialog.open({ directory: true, multiple: false });
    if (dir && typeof dir === "string") {
      if (dir.split("\\").at(-1) === "Minifantasy_Weapons_Assets") {
        weaponsDir.value = dir;
        loadWeapons();
      } else {
        dialog.message(
          'The source directory is the one named "Minifantasy_Weapons_Assets"',
        );
      }
    }
  };
  const selectCrafting1Dir = async () => {
    const dir = await dialog.open({ directory: true, multiple: false });
    if (dir && typeof dir === "string") {
      crafting1Dir.value = dir;
      loadCrafting1();
    }
  };
  const selectCrafting2Dir = async () => {
    const dir = await dialog.open({ directory: true, multiple: false });
    if (dir && typeof dir === "string") {
      crafting2Dir.value = dir;
      loadCrafting2();
    }
  };
  const selectUnarmedDir = async () => {
    const dir = await dialog.open({ directory: true, multiple: false });
    if (dir && typeof dir === "string") {
      addonsDir.value = dir;
      loadAddons();
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
  const selectedAnimations = localStorageData<string[]>("weaponsSelected", []);
  const selectWeapon = (name?: string) => {
    if (name) {
      selectedAnimations.value = selectedAnimations.value.includes(name)
        ? selectedAnimations.value.filter((x) => x !== name)
        : [...selectedAnimations.value, name];
    }
  };

  const select = (event: {
    detail: { path: string; index: number; name: string };
  }) => {
    if (
      selected.value.some(
        (x) => x.name === event.detail.name && x.path !== event.detail.path,
      )
    ) {
      selected.value = selected.value.map((x) =>
        x.name === event.detail.name ? event.detail : x,
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

  const saveBuffer = async (
    buffer: HTMLCanvasElement,
    name: string = "NPC",
  ) => {
    if (!targetDirectory) {
      selectTargetDir();
    }
    if (targetDirectory) {
      const blob = await new Promise<Blob | null>((res) =>
        buffer.toBlob(res, "png"),
      );
      if (blob) {
        await fs.writeBinaryFile(
          targetDirectory.value + "/" + name + ".png",
          await blob.arrayBuffer(),
        );
      }
    }
  };
  $: race = selected.value
    .find((x) => x.path.includes("_Character"))
    ?.path.split("\\")
    .at(-2) as "Elf" | "Human" | "Orc";
  $: baseColor = {
    Elf: "elfskin",
    Human: "whiteskin",
    Orc: "greenskin",
  }[race];
  const findCorrespondingHuman = async () => {
    const humanWalk = rootFolder
      ?.find((x) => x?.name === "Walk")
      ?.children?.find((x) => x?.name === "_Characters")
      ?.children?.find((x) => x?.name === race)
      ?.children?.find((x) => x.path.includes(baseColor));
    return await loadImageFromPath(humanWalk!.path);
  };

  const getWeaponAnimations = async (
    animationData: animationData,
    images: (HTMLImageElement | HTMLCanvasElement)[],
    palette: palette,
    characterIndex: number,
  ) => {
    if (!animationData.character) return;
    const selectedCharacter = await loadImageFromPath(animationData.character);
    const characterPaletteSwapped = swapPalette(selectedCharacter, palette);
    const front = animationData.front
      ? await loadImageFromPath(animationData.front)
      : null;
    const back = animationData.back
      ? await loadImageFromPath(animationData.back)
      : null;
    const buffer = document.createElement("canvas");
    buffer.width = selectedCharacter.width;
    buffer.height = selectedCharacter.height;
    const ctx = buffer.getContext("2d", { alpha: true });
    back && ctx?.drawImage(back, 0, 0);
    ctx?.drawImage(characterPaletteSwapped, 0, 0);
    for (let i = 1; i < images.length; i++) {
      const img = images[i];
      const [comparator, width] = pixelComparator(selected.value[i].path);
      for (let x = 0; x < buffer.width; x += 32) {
        for (let y = 0; y < buffer.height; y += 32) {
          for (let foot = 0; foot < 32; foot += width) {
            const [imgX, imgY] = comparator(images[characterIndex], 0, y, foot);
            const [offsetX, offsetY] = comparator(
              selectedCharacter,
              x,
              y,
              foot,
            );

            if (!(offsetX === 0 && offsetY === 0)) {
              const newX = x + offsetX - imgX;
              const newY = y + offsetY - imgY;
              if (offsetX + offsetY != 0) {
                ctx?.drawImage(
                  img,
                  0 + foot,
                  y,
                  width,
                  32,
                  newX + foot,
                  newY,
                  width,
                  32,
                );
              }
            }
          }
        }
      }
    }
    front && ctx?.drawImage(front, 0, 0);
    if (ctx) {
      saveBuffer(ctx.canvas, characterName.value + animationData.name);
    }
    for (const additionalAnimations of animationData.more) {
      getWeaponAnimations(
        additionalAnimations,
        images,
        palette,
        characterIndex,
      );
    }
  };

  const generateSprites = async () => {
    loading = true;
    const individualSprites: HTMLCanvasElement[] = [];
    const animations = rootFolder.filter((folder) => folder.children);
    if (!selected.value.some((x) => x.path.includes("_Character"))) {
      return dialog.message(
        "at least one base character is needed to generate the animations",
      );
    }
    for (const { name } of animations) {
      if (!name) return;
      const buffer = document.createElement("canvas");
      buffer.width = 0;
      buffer.height = 0;
      const ctx = buffer.getContext("2d", { alpha: true })!;
      ctx.imageSmoothingEnabled = false;

      const images: (HTMLImageElement | HTMLCanvasElement)[] = [];
      for (const { path } of selected.value) {
        images.push(await loadImageFromPath(path.replaceAll("Idle", name)));
      }
      for (const img of images) {
        buffer.width ||= img.width;
        buffer.height ||= img.height;
        ctx?.drawImage(img, 0, 0, img.width, img.height);
      }
      if (name === "Walk" && weaponsFolder.length) {
        for (const animation of selectedAnimations.value) {
          const humanWalk = await findCorrespondingHuman();
          const characterIndex = selected.value.findIndex((x) =>
            x.path.includes("_Character"),
          );
          const data = await getAnimationData();

          const palette = getPalette(humanWalk, images[characterIndex]);
          if (data[animation]) {
            await getWeaponAnimations(
              data[animation],
              images,
              palette,
              characterIndex,
            );
          }
        }
      }
      individualSprites.push(buffer);
    }

    for (let i = 0; i < individualSprites.length; i++) {
      await saveBuffer(
        individualSprites[i],
        characterName.value + animations[i].name,
      );
    }
    loading = false;
    finished = true;
    setTimeout(() => (finished = false), 1000);
  };

  $: idle = rootFolder.find((x) => x.name === "Idle")?.children;
  const findCharacterFolder = (folder: fs.FileEntry): fs.FileEntry | null => {
    let found: fs.FileEntry | null = null;
    const find = (folder: fs.FileEntry) => {
      if (folder.children) {
        for (const children of folder.children) {
          if (children.name?.includes("Character")) {
            found = children;
          } else if (children.children) {
            find(children);
          }
        }
      }
    };
    find(folder);
    return found;
  };

  const getWeaponsEntries = (folders: fs.FileEntry[]) => {
    return folders.filter(
      (f) =>
        "children" in f &&
        ["_", "Character", "GIF"].every((x) => !f.name?.includes(x)),
    );
  };
  type animationData = {
    character?: string;
    front?: string;
    back?: string;
    more: animationData[];
    name: string;
  };
  const findImagePath = (folder: fs.FileEntry, key: string) =>
    folder?.children?.find((x) => x.name?.split(/[_.]/).at(-2) === key)?.path;

  const getAnimationData = () => {
    const result: Record<string, animationData> = {};
    // Weapons;
    const charged = weaponsFolder.find((x) => x.name?.includes("Charged"));
    for (const folder of weaponsFolder) {
      if (!folder.name?.includes("Charged")) {
        const characters = findCharacterFolder(folder);
        if (characters) {
          for (const weapon of folder?.children ?? []) {
            if (weapon.name && !weapon.name.includes("_") && weapon.children) {
              const character = findImagePath(characters, race?.toLowerCase());
              const front = findImagePath(weapon, "f");
              const back = findImagePath(weapon, "b");
              const res: animationData = {
                character,
                front,
                back,
                more: [],
                name: weapon.name,
              };
              const chargedFolder = charged?.children
                ?.map((x) => x.children)
                .flat()
                .find((x) => x?.name === weapon.name);
              if (chargedFolder) {
                const chargedFront = findImagePath(chargedFolder, "f");
                const chargedBack = findImagePath(chargedFolder, "b");
                const more = {
                  character,
                  front: chargedFront,
                  back: chargedBack,
                  more: [],
                  name: "Charged" + weapon.name,
                };
                res.more.push(more);
              }
              result[weapon.name] = res;
            }
          }
        }
      }
    }
    // Crafting
    for (const profession of [...crafting1Folder, ...crafting2Folder]) {
      for (const folder of profession.children ?? []) {
        const characters = findCharacterFolder(folder);
        if (characters && folder.name) {
          const character = characters?.children?.find((x) =>
            x.name?.includes(race?.toLowerCase()),
          )?.path;
          result[folder.name] = { character, more: [], name: folder.name };
        }
      }
    }
    // Addons
    for (const folder of addonsFolder) {
      if (folder.name === "Unarmed" && folder.children) {
        for (const weapon of folder.children) {
          const characters = findCharacterFolder(weapon);
          if (characters && weapon.name && weapon.children) {
            const character = findImagePath(characters, race?.toLowerCase());
            const front = weapon.children.find(
              (c) => c.name?.split(".")?.at(-2)?.at(-1) === "f",
            )?.path;
            const back = weapon.children.find(
              (c) => c.name?.split(".")?.at(-2)?.at(-1) === "b",
            )?.path;
            const res: animationData = {
              character,
              front,
              back,
              more: [],
              name: weapon.name,
            };
            result[weapon.name] = res;
          }
        }
      } else {
        const characters = findCharacterFolder(folder);
        if (characters) {
          for (const weapon of folder?.children ?? []) {
            if (weapon.name && !weapon.name.includes("_") && weapon.children) {
              const character = findImagePath(characters, race?.toLowerCase());
              const front = findImagePath(weapon, "front");
              const back = findImagePath(weapon, "back");
              const res: animationData = {
                character,
                front,
                back,
                more: [],
                name: weapon.name,
              };
              result[weapon.name] = res;
            }
          }
        }
      }
    }
    return result;
  };
  let buttons;
  let buttonsLeft: HTMLDivElement | null = null;
  let loading = false;
  let finished = false;
  $: crafting = [
    [crafting1Dir, 1, selectCrafting1Dir, crafting1Folder],
    [crafting2Dir, 2, selectCrafting2Dir, crafting2Folder],
  ] as const;
  // Random Menu
  let reference: HTMLButtonElement;
  let showRandomMenu = false;
  const random = localStorageData<Record<string, string[]>>("random", {
    Head: [],
    Body: [],
    _Characters: [],
  });
  const addRandom = (place: string, piece: string) => {
    random.value = {
      ...random.value,
      [place]: random.value[place].includes(piece)
        ? random.value[place].filter((x) => x !== piece)
        : [...random.value[place], piece],
    };
  };
  const generateRandom = () => {
    for (const [place, pieces] of Object.entries(random.value)) {
      const folder = idle?.find((x) => x.name === place);
      if (!folder) continue;
      for (const piece of pieces) {
        const subFolder = folder.children?.find(
          (x) => x.name === piece,
        )?.children;
        if (!subFolder) continue;
        let randomSelected =
          subFolder[Math.floor(Math.random() * subFolder.length)];
        if (randomSelected.children?.length) {
          randomSelected =
            randomSelected.children[
              Math.floor(Math.random() * randomSelected.children.length)
            ];
        }
        if (!randomSelected.name) return;
        const newSelected = {
          name: piece,
          path: randomSelected.path,
          index: 0,
        };

        selected.value = selected.value.some((x) => x.name === piece)
          ? selected.value.map((x) => (x.name === piece ? newSelected : x))
          : [...selected.value, newSelected];
      }
    }
  };
</script>

<SvelteUIProvider themeObserver="dark">
  <Popper {reference} mounted={showRandomMenu}>
    <Card style="display:grid;gap:0.5rem">
      {#if idle}
        {#each [["Head", "Head"], ["Characters", "_Characters"], ["Body", "Body"]] as [label, name]}
          <Text size="sm" weight="bold">{label}</Text>
          {#each idle.find((x) => x.name === name)?.children ?? [] as child}
            {#if child.name}
              <div style="margin-left:1rem">
                <Checkbox
                  label={child.name}
                  checked={random.value[name].includes(child.name)}
                  on:click={addRandom(name, child.name)}
                ></Checkbox>
              </div>
            {/if}
          {/each}
        {/each}
      {/if}
      <Button on:click={generateRandom} style="margin:auto">Generate</Button>
    </Card>
  </Popper>
  <div
    style="display:grid;grid-template-columns:400px 1fr auto 300px;gap:1rem;height:calc(100vh - 2rem);"
  >
    <!-- !CLOTHES -->
    <div>
      <div bind:this={buttonsLeft}>
        <Button
          color="gray"
          on:click={selectRootDirectory}
          style="background:{rootDir.value ? '' : 'red'};width:100%"
        >
          <Fa slot="leftIcon" icon={faFolderOpen} />
          Select source directory<br />(Generic_NPCs)
        </Button>
      </div>
      {#if idle}
        <div
          style="max-height:calc(100vh - 2rem - {buttonsLeft.clientHeight}px);overflow-y:auto"
        >
          <Tabs>
            {#each [["Body", "Body"], ["Head", "Head"], ["Characters", "_Characters"]] as [label, name]}
              <Tabs.Tab {label}>
                {#if idle.find((x) => x.name === name)?.children}
                  {#each idle.find((x) => x.name === name)?.children ?? [] as child}
                    <div>
                      <Section
                        name={child.name ?? ""}
                        children={child.children ?? []}
                        on:selected={select}
                        selected={selected.value}
                      />
                    </div>
                  {/each}
                {/if}
              </Tabs.Tab>
            {/each}
          </Tabs>
        </div>
      {/if}
    </div>
    <!-- !CONTROLS -->
    <div
      style="display:grid;grid-template-columns:1fr;grid-template-rows:auto 1fr;height: 100%; place-items: center;"
    >
      <div>
        <Group>
          <Button
            color="gray"
            on:click={selectTargetDir}
            style="background:{targetDirectory.value ? '' : 'red'}"
          >
            <Fa slot="leftIcon" icon={faFileArrowDown} />
            Select target directory
          </Button>
          <Input
            placeholder="Character name"
            style="padding:0.5rem"
            bind:value={characterName.value}
          />
          <Button
            bind:element={reference}
            on:click={() => (showRandomMenu = !showRandomMenu)}
            >Randomize</Button
          >
          <Button color="gray" on:click={generateSprites} style="margin:auto">
            <Fa
              slot="leftIcon"
              icon={loading
                ? faSpinner
                : finished
                  ? faCheckCircle
                  : faFileExport}
              color={finished ? "#33cc33" : ""}
              pulse={loading}
            />
            Generate sprites
          </Button>
        </Group>
      </div>

      <Card
        shadow="xl"
        radius="xl"
        style="display:grid;grid-template-columns:1fr;grid-template-rows:auto 1fr;"
      >
        {#each selected.value as img}
          {#key img.path}
            <div style="grid-area:1/1/1/1">
              <Display path={img.path} size={300} />
            </div>
          {/key}
        {/each}
      </Card>
    </div>
    <!-- !DISPLAY -->
    <div
      style="display:flex;flex-direction:column;height: 100%;font-size:0.8rem"
    >
      <div bind:this={buttons} style="display:grid;gap:0.2rem;">
        <Button color="gray" on:click={() => (selected.value = [])}>
          <Fa slot="leftIcon" icon={faTrash} />
          Clear</Button
        >
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
            <Card padding="xs" style="position:relative">
              <ActionIcon
                variant="outline"
                size="xs"
                style="position:absolute;top:0.2rem;right:0.2rem"
                on:click={() => select({ detail: item })}
              >
                <Fa icon={faTimes} />
              </ActionIcon>
              <Display path={item.path} />
            </Card>
          </div>
        </DragDropList>
      </div>
    </div>
    <!-- !TABS -->
    <div style="font-size:0.8rem;overflow-y:auto">
      <Text align="center" size="lg" weight="bold">Animations</Text>
      <Tabs>
        <!-- !WEAPONS -->
        <Tabs.Tab label="Weapons">
          <div style="display:flex;gap:0.5rem;flex-direction:column;">
            <Button
              color="gray"
              on:click={selectWeaponsDir}
              style="background:{weaponsDir.value ? '' : 'red'};width:100%"
            >
              <Fa slot="leftIcon" icon={faFolderOpen} />
              Select source directory<br />(Weapons)
            </Button>
            <div style="display:grid;gap:1rem;grid-template-columns:1fr 1fr">
              {#each weaponsFolder.filter((x) => !x.name?.includes("harged")) as { name, children }}
                <Card shadow="sm" padding="md">
                  <Card.Section first padding="xs">
                    <h4>
                      {name?.replaceAll("_", " ")}
                    </h4>
                  </Card.Section>
                  <Group spacing="xs" direction="column">
                    {#if name && children}
                      {#each getWeaponsEntries(children) as weapon}
                        <Chip
                          size="xs"
                          variant="filled"
                          checked={weapon.name &&
                            selectedAnimations.value.includes(weapon.name)}
                          on:click={() => selectWeapon(weapon.name)}
                          >{weapon.name}</Chip
                        >
                      {/each}
                    {/if}
                  </Group>
                </Card>
              {/each}
            </div>
            <Button
              color="gray"
              on:click={selectUnarmedDir}
              style="background:{addonsDir.value ? '' : 'red'};width:100%"
            >
              <Fa slot="leftIcon" icon={faFolderOpen} />
              Select source directory<br />(Addons)
            </Button>
            <div style="display:grid;gap:1rem;grid-template-columns:1fr 1fr">
              {#each addonsFolder.filter((x) => !x.name?.includes("Diag")) as { name, children }}
                <Card shadow="sm" padding="md">
                  <Card.Section first padding="xs">
                    <h4>
                      {name?.replaceAll("_", " ")}
                    </h4>
                  </Card.Section>
                  <Group spacing="xs" direction="column">
                    {#if name && children}
                      {#each getWeaponsEntries(children) as weapon}
                        <Chip
                          size="xs"
                          variant="filled"
                          checked={weapon.name &&
                            selectedAnimations.value.includes(weapon.name)}
                          on:click={() => selectWeapon(weapon.name)}
                          >{weapon.name}</Chip
                        >
                      {/each}
                    {/if}
                  </Group>
                </Card>
              {/each}
            </div>
          </div>
        </Tabs.Tab>
        <!-- !CRAFTING -->
        <Tabs.Tab label="Crafting">
          <div style="display:flex;gap:0.5rem;flex-direction:column">
            {#each crafting as [dir, nb, select, folder]}
              <Button
                color="gray"
                on:click={select}
                style="background:{dir.value ? '' : 'red'};width:100%"
              >
                <Fa slot="leftIcon" icon={faFolderOpen} />
                Select source directory<br />(Crafting {nb})
              </Button>

              <div style="display:grid;gap:1rem;grid-template-columns:1fr 1fr">
                {#each folder.filter((x) => x.name?.includes("Prof") && x?.children) as { name, children }}
                  <Card shadow="sm" padding="md">
                    <Card.Section first padding="xs">
                      <h4>
                        {name?.replaceAll("_", " ")}
                      </h4>
                    </Card.Section>
                    <Group spacing="xs" direction="column">
                      {#if name && children}
                        {#each getWeaponsEntries(children).filter(findCharacterFolder) as weapon}
                          <Chip
                            size="xs"
                            variant="filled"
                            checked={weapon.name &&
                              selectedAnimations.value.includes(weapon.name)}
                            on:click={() => selectWeapon(weapon.name)}
                            >{weapon.name}</Chip
                          >
                        {/each}
                      {/if}
                    </Group>
                  </Card>
                {/each}
              </div>
            {/each}
          </div>
        </Tabs.Tab>
      </Tabs>
    </div>
  </div>
</SvelteUIProvider>

<style global>
  :global(.svelteui-AccordionItem-panel) {
    padding: 0px 0px 10px 0px !important;
  }
  :global(
      .svelteui-AccordionItem-controlContent:not(
          .svelteui-AccordionItem-root
            .svelteui-AccordionItem-root
            .svelteui-AccordionItem-controlContent
        )
    ) {
    text-decoration: underline;
    font-weight: bold;
  }
</style>
