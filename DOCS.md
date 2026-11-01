# Docs

## Regarding MD
- Two files: `<name>.zh.md` and `<name>.en.md`. **The files with the same name in both Chinese and English form a pair**.
- When a certain language is missing, the construction will display a warning (`!!`), and the page still appears, but the language readers will see the content in another language.
- The file header must be labeled as "front matter":

  ```yaml
  ---
  title: Main page heading (for search inclusion)
  short: The short name used for the left column navigation
  desc: One-sentence summary (displayed in the search results)
  id: Optional page anchor, default is the file name;
      overview-top / howto / usage / loadorder / porting |Don't change.
      > There is a certain part of the code that references the title of this article with the id.
  ---
  ```

  The first line of the main text must be `# First-level Heading`. **There is no need to specify order** — the sequence is determined by `pages.json`.

## Add a page/Delete a page/Rearrange the order

Everything is in `_docbuild/config/pages.json`, and the list is the only source (no automatic discovery)

```json
{
  "docs":   ["overview", "howto", "usage", "load-order", "porting"],
  "guides": ["guide-start", "guide-newkeys", "guide-uses", "guide-examples",
             "guide-functions", "guide-faq", "guide-skins"]
}
```

- The page anchor is the `id` of the frontMatter (if not specified, it is the file name), and internal links `#my-page` can be used directly.

- **id** represents the overall anchor point of the article. If you want to **interlink subsections** within the page, for example, using the format "## Title {#SubsectionID}"

- It can also directly refer to the automatically generated anchors (no need to write or build them; they are automatically present during the process) such as: a certain class [Control](#cls-Control) \ a certain function [Object:New](#fn-Object-New) \ quick reference for class index [Class Index](#class-index) \ properties × methods (#props-methods)



## Markdown syntax (syntax supported by the builder)

| Writing | Effect |
| --- | --- |
| `# Title` | First-level heading (must appear on the first line of each page) |
| `## Section {#anchor}` | Subheading/anchor point; **All internal links rely on this id**. During the migration of old pages, the original id must be retained. |
| `**Bold Text**` `*Italics*` `Inline code` `~~Delete~~` | Common inline styles |
| `[Text](#anchor)` / `[Text](https://...)` | Internal/External Links |
| `- item` / `1. Step` | Unordered/Ordered List (automatically adds class="tips") |
| GFM Table | Rendered as "table.compact" |
| Three code blocks enclosed in triple backticks | When you type `lua` in the language field, it will be highlighted automatically. You can also add `title=` / `hint=` to generate the file name column. |
| `> [!ok] text` | Colorful prompt blocks:`[!lead]` Emphasis,`[!note]` Blue-gray`[!ok]` Green,`[!warn]` Red |
| `:::html` … `:::` | Output HTML as is (used only for blocks that cannot be expressed in Markdown, such as  `<details>` collapsible sections and color blocks) |
| `{{CODE:File name\Instruction}}` | Insert the entire line `LuaUI/Widgets/<File>` The source code (with highlighting) |
| `[[stats]]` | Insert the homepage statistics card (the numbers are from `config/stats.json`) |
| `[[loadorder]]` | Insert the loading sequence list of `core.lua` |
| `[[tagline]]` | Insert the site slogan (the template is in `config/site.json`) |

## Configure JSON

| file | Function |
| --- | --- |
| `_docbuild/config/pages.json` | List and sequence of the left column pages |
| `_docbuild/config/site.json` | `titleZh` / `titleEn`(Browser tab page main title)`brandZh` / `brandEn`(Left name in the header)`taglineZh` / `taglineEn` Slogan template,`{dir}` `{classes}` `{lines}` Will be replaced`repoUrl`（The address of the circular GitHub button in the top bar; if left blank, it will be hidden.`defaultTheme` `"light"` `"dark"`(If the visitor has not manually changed the theme, use it.) `outputDir`(Product Catalogue, Default`"."`Change to `"docs"`That's all. `<Github>/docs/`For ease of use with GitHub Pages) |
| `_docbuild/config/stats.json` | The homepage features 7 statistical figures `values`Manual maintenance; can be used after modifying the source code`--update-stats` Rewrite |
| `_docbuild/config/todo.json` | Framework to-do list/roadmap (the original `todo.txt`), only visible in the repository and not on the page. |

## Verification command

| command | fun |
| --- | --- |
| `node chili_old/_docbuild/build-all.cjs` | Full build + self-check (anchors/links/placeholders/embedded JS/residual Chinese on English pages), followed by a single line of summary description for synchronization. |
| `node chili_old/_docbuild/descsync.cjs` | Read-only check: Newly added/deleted/renamed classes and members, empty descriptions, orphan descriptions, deleted source code files; **Empty descriptions will list one by one "Which JSON file :: Which field"**; exit 0 for clean/1 for pending processing/2 for error |
| `node chili_old/_docbuild/_checkmd.cjs guides guide-start` | Single-page MD self-check: front matter,`{#id}`,`{{CODE}}`,`[[embed]]` |
| `node chili_old/_docbuild/_validate.cjs chili_old/chiliui_api_reference.html` | Only check the generated HTML |
| `node chili_old/_docbuild/parse.cjs` | Just re-scan the Lua source code (it is usually not necessary to run it separately) |


## How to maintain the description file (desc)

Each `.lua` source file corresponds to a description JSON, with the relative path being exactly mirrored, and the file name remains as ``.lua``:

```text
Controls/font.lua            _docbuild/desc/Controls/font.lua.json
Skins/default/skin.lua       _docbuild/desc/Skins/default/skin.lua.json
core.lua                     _docbuild/desc/core.lua.json
```

**The structure of each JSON:**

```json
{
  "file": "Controls/font.lua",
  "classes": {
    "Font": {
      "summary": "A brief description of the class",
      "props":  { "size": "Property Description" },
      "funcs":  { "Font:New": { "desc": "Function Description", "params": { "a": "Parameter Explanation" }, "returns": "Return value description" } }
    }
  },
  "module":  { "summary": "File-level description", "funcs": { "table:merge": { "desc": "..." } } },
  "fileDesc": "One of the responsibilities listed in the document checklist",
  "_orphans": { "classes": {}, "modules": {}, "files": {} },
  "_frozen": false
}
```

If you want to write or modify the text, simply change the `summary` / `props` / `funcs` here. **Do not manually add or delete keys** - the structure is determined by the source code, and the missing keys will be filled in by the script.

> `.bat` files are merely launchers: they are purely ASCII (only performing `chcp 65001`, `cd`, and running the script), and all Chinese and English prompts as well as the `WRITE`, `BUILD`, and `ROLLBACK` confirmations are written in `_docbuild/batmenu.cjs`. If you want to change the prompt text or do translation, just modify that one file - do not write Chinese in the `.bat` file. When cmd parses Chinese batch files, it starts execution from the middle of the line, and this can cause unexpected errors.

### Safety regulations (script guarantee)

- **Never overwriting**: Existing text will never be overwritten by null values; `--write` is idempotent.
- Member is deleted/annotated > The original text is moved to the `_orphans` file of the same document; if the same member appears again, the text will be automatically restored.
- Automatically back up the entire directory before writing; `--prune` will actually clear the `_orphans`.
- Files with `_frozen: true` should be completely skipped (for testing or manual experiments).
- If more than 20% of the source files are lost, the write operation will be rejected (to prevent incorrect directory selection). If you are sure, you can add `--force`.

### Which things will not be documented (to avoid noise)?

- `local X = Object:Inherit{... }` This type of **private file class**: It participates in the rendering process but does not appear in the class index.
- Dynamically generated members (`C[k] = ...`, runtime assignment), fields below the second layer of nested tables, and pseudo-code within comments/strings.
- Any `.lua` files (pure tool/pure comment files) without class or module functions will not have a description created; skin files will only have one "file description" slot (that is, the summary text below the skin page title), and no module/function-level descriptions will be provided.
- The file descriptions for each skin are located in `/_docbuild/desc/Skins/<skin>/skin.lua.json` under the `fileDesc` section. Simply modify and rebuild.
