# remark-counter

Markdown 内でカウンターを作成するプラグイン.

## Install

npm:

```
npm install @hankei6km/remark-counter
```

## Requirement

- [`remark-directive`](https://github.com/remarkjs/remark-directive)

## Usage

code:
```typescript
import { readFileSync } from 'fs'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkDirective from 'remark-directive'
import remarkCounter from '@hankei6km/remark-counter'

const markdown = readFileSync('test.md').toString()

unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(remarkCounter)
  .use(remarkStringify)
  .freeze()
  .process(markdown, (err, file) => {
    if (err) {
      console.error(err)
    }
    console.log(String(file))
  })

```

input:
```markdown
# test

:num{name="fig" reset}

![first](/images/fig-first.png)
*fig :num{name="fig" up}*

![second](/images/fig-second.png)
*fig :num{name="fig" up}*

![third](/images/fig-third.png)
*fig :num{name="fig" up}*
```

yield:
```markdown
# test



![first](/images/fig-first.png)
*fig 1*

![second](/images/fig-second.png)
*fig 2*

![third](/images/fig-third.png)
*fig 3*

```


## Writing

### Definition / Reference

- Definition - `:num{name="variable-name" define}`
- Reference - `:num{name="variable-name"}`

### Counter

- Reset - `:num{name="variable-name" reset}`
- Up - `:num{name="variable-name" up}`
- Look - `:num{name="variable-name"}`


## CLI

コマンドとして実行するには [`remark-cli`](https://github.com/remarkjs/remark/tree/main/packages/remark-cli) が必要です。

### Install

```console
$ mkdir counter
$ cd counter
$ npm init -y
$ npm install remark-cli remark-directive remark-frontmatter remark-gfm @hankei6km/remark-counter
```

### Config

```js
// .remarkrc.mjs
import remarkDirective from 'remark-directive'
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm'
import remarkCounter from '@hankei6km/remark-counter'

const remarkConfig = {
  plugins: [
    remarkDirective,
    remarkFrontmatter,
    remarkGfm,
    remarkCounter
  ]
}

export default remarkConfig
```

### Run

```console
$ npx remark < test.md
```


## License

MIT License

Copyright (c) 2022 hankei6km

