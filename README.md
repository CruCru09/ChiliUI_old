# Chili UI(chili_old) General Version

First of all, I would like to express my gratitude to **GoogleFrog**. All the content here is based on the `Zero-K\LuaUI\Widgets\chili_old`. 

repository The Chili UI in this area will remain up-to-date and stable (I really can't stand it when no one maintains these), and for relatively older engine versions, the Chili UI is still relatively stable and user-friendly. At the same time, these are written in LUA (this probably won't become outdated).

> The Chili UI framework ported from ZK, which is compatible with pure Spring/Recoil engine, and a zero-dependency document building pipeline. Edit the Markdown files under `chili_old/_docbuild/content/`, run `node chili_old/_docbuild/build-all.cjs`, and you get a single-file bilingual HTML reference.

## Chili UI

Chili is Springs' own graphical interface framework. It is a flexible type framework that enables you to quickly create beautiful graphical interfaces.

1. **Chili UI framework** `Controls/`、`Handlers/`、`Headers/`、`Skins/`、`Themes/`、`core.lua` It is a Chili UI that can be directly copied and used in other Recoil/Spring games (originally from the Zero-K version).

2. **Document generation pipeline** `_docbuild/` Scan all the Lua source code and merge the manually maintained Markdown content. Generate two separate single-file websites: `chiliui_api_reference.html` (in Chinese) and `chiliui_api_reference_en.html` (in English).

---

## Use it in the game

```text
LuaUI/Widgets/
├─ api_chili.lua          Loader (Layer 1000)
├─ chili_old/             Framework itself (the `chili_old` directory)
└─ my_chili_widget.lua          Your own widget's layer must be greater than 1000.
```

### Chili Rules

- **layer > 1000**: `api_chili.lua` itself is set to 1000. Widgets are initialized in ascending order based on the layer. If the layer value is less than or equal to 1000, `WG.Chili` remains nil.

- **Top-level file does not contain classes**: During the loading stage, the framework has not yet been initialized. Only `local Chili` can be declared. The actual class is retrieved from `WG.Chili` in the `widget:Initialize()` method.

- The top-level control must be assigned to a parent: `parent = Chili.Screen0`; controls without a parent are orphans and will never be drawn or respond to mouse events.

The complete transplantation instructions can be found in [PORTING.md](docs/PORTING.md)

## Modify the document / Add pages (Markdown pipeline)

The content that can be manually edited is all located in `chili_old/_docbuild/content/`. **The list of pages is explicitly maintained** (in `chili_old/_docbuild/config/pages.json`, the array order is the same as the left column order), and it is not based on automatic discovery

```text
chili_old/_docbuild/content/
├─ docs/
│  ├─ overview.zh.md   overview.en.md
│  └─ ...
└─ guides/
   ├─ guide-start.zh.md   guide-start.en.md
   └─ ...
```

## Build Documentation

Requires Node.js 16+ (The script uses `fs.rmSync`, and there are no third-party dependencies)

You can execute it from the **root directory of the warehouse** (the script defaults to using `chili_old` as the root; you can also use `cd chili_old` first).

```bash
node chili_old/_docbuild/build-all.cjs                 # Scan the source code + Generate two pages in both Chinese and English + Self-check
node chili_old/_docbuild/build-all.cjs --update-stats  # Also, please write the latest statistics back into config/stats.json
```

Windows can also directly double-click `chili_old/build-docs.bat`.

`WRITE` / `BUILD` / `ROLLBACK`

### Single-step command (for debugging):

| Command | Function |
| --- | --- |
| `node chili_old/_docbuild/parse.cjs` | Just scan all the Lua source code `chili_old/_docbuild/raw.json` |
| `node chili_old/_docbuild/build.cjs` | Generate only Chinese pages |
| `node chili_old/_docbuild/build.cjs <Directory> en` | Generate English page |
| `node chili_old/_docbuild/_checkmd.cjs guides guide-start` | Verify the front matter /anchors/ embedded blocks of a single md page |
| `node chili_old/_docbuild/_validate.cjs <html...>` | Check the anchors, placeholders and embedded JavaScript on the generated page. |
| `node chili_old/_docbuild/descsync.cjs` | Check whether the source code and the description match (new additions, deletions, renaming, or blank descriptions) |
| `node chili_old/_docbuild/descsync.cjs --write` | Fill in the blank positions (first back up to `_docbuild/_attic/auto-<time>/`) |
| `node chili_old/_docbuild/descsync.cjs --rename "Class:Old=Class:New"` | Description text for renaming members |

1. Only modify md and json files, without touching the source code. **build-docs.bat**
2. Added, deleted or modified the .lua source code file **update-desc-skeleton.bat**
   > First, automatically back up the current description, then only fill in the empty description sections without overwriting the existing text.
3. Want to see the source code and make sure the description is accurate? **check-structure.bat**
   > Read-only, usually used for checking and troubleshooting.
4. The "update-desc-skeleton.bat" file was wrongly created. I want to restore it. **rollback-desc.bat**
   > It will use the "auto-" backup to completely overwrite the entire "desc" directory, and this action is irreversible.

## Directory Structure

```text
ChiliUI_old/                     # Warehouse root
├─ api_chili.lua                 # Loader (Layer 1000)
├─ chili_demo_*.lua              # Examples
├─ dbg_chili_inspector.lua       # Debugging widget: Control tree check
├─ dbg_chili_profiler.lua        # Debugging widget: Rendering performance
├─ README.md  DOCS.md            # -------------------
└─ chili_old/                    # Framework ontology/Document pipeline
   ├─ Controls/ Headers/ Handlers/ Skins/ Themes/ core.lua
   ├─ PORTING.md                 # Transplant to other games
   ├─ chiliui_api_reference*.html # The generated document
   ├─ build-docs.bat / build-docs.bat  # Windows One-click setup
   ├─ check-structure.bat / check-structure.bat   # ----------
   ├─ update-desc-skeleton.bat / rollback-desc.bat           # --------
   └─ _docbuild/                 # Document pipeline
      ├─ parse.cjs build.cjs build-all.cjs md.cjs
      ├─ content/   # The MD files that need to be maintained
      ├─ config/    # pages.json / site.json / stats.json / todo.json
      ├─ desc/ desc_en/  # Class and member descriptions, arranged according to the source code path - one file per JSON.
      ├─ descsync.cjs    # ----------------
      └─ raw.json   # The result of parsing
```

## Thanks

You can take a look at this [gajop/chiliui](https://github.com/gajop/chiliui) 

Then the content here was transformed by Zero-K using the ChiliUI (GoogleFrog) framework.
This repository is a branch for the generalized and documented version of ChiliUI.