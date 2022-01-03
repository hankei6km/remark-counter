import { Plugin, Transformer } from 'unified'
import { Node } from 'unist'
import { Parent, Root, Text } from 'mdast'
import { TextDirective, ContainerDirective } from 'mdast-util-directive'
import { visitParents, CONTINUE, SKIP } from 'unist-util-visit-parents'
import toSafeInteger from 'lodash.tosafeinteger'

export type RemarkNumbersOptions = {}

export type DefineCounterTrigger = { type: string; depth: number }
export class DefineCounter {
  private counter: number = 0
  private resetTrigger: DefineCounterTrigger[] = []
  constructor() {}
  addResetTrigger(t: DefineCounterTrigger) {
    this.resetTrigger.push({ type: t.type, depth: t.depth })
  }
  reset(node: Node): boolean {
    if (
      this.resetTrigger.findIndex(
        ({ type, depth }) => type === node.type && depth === (node as any).depth
      ) >= 0
    ) {
      this.counter = 0
      return true
    }
    return false
  }
  up(): number {
    this.counter++
    return this.counter
  }
  look(): number {
    return this.counter
  }
}

export function errMessageNotDefined(name: string): Text {
  return {
    type: 'text',
    value: `(ReferenceError: "${name}" is not defined)`
  }
}

export const remarkCounter: Plugin<
  [RemarkNumbersOptions] | [RemarkNumbersOptions[]] | [],
  string,
  Root
> = function remarkCounter(): Transformer {
  // 事前処理(reset などの定義)用.
  const visitTestPre = (node: Node) => {
    if (
      node.type === 'containerDirective' &&
      (node as ContainerDirective).name === 'num'
    ) {
      return true
    }
    return false
  }
  const visitTest = (node: Node) => {
    if (node.type === 'textDirective') {
      return true
    }
    return false
  }
  return function transformer(tree: Node): void {
    const numners: Record<string, number> = {}
    const defineCounter = new DefineCounter()

    const visitorPre = (node: Node, parents: Parent[]) => {
      const d = node as ContainerDirective
      if (d.attributes?.reset !== undefined) {
        // reset 用定義.
        const parentsLen = parents.length
        const parent: Parent = parents[parentsLen - 1]
        const nodeIdx = parent.children.findIndex((n) => n === node)
        // とりあえず heading のみ対応.
        d.children.forEach((n) => {
          if (
            n.type == 'heading' &&
            n.children.length === 1 &&
            n.children[0].type === 'textDirective' &&
            n.children[0].name === 'num'
          ) {
            defineCounter.addResetTrigger({ type: n.type, depth: n.depth })
          }
        })
        parent.children.splice(nodeIdx, 1)
      }
    }

    const visitor = (node: Node, parents: Parent[]) => {
      defineCounter.reset(node) // リセットさせる.

      // visitTest でフィルターしていないのでここで判定する.
      if (
        node.type === 'textDirective' &&
        (node as TextDirective).name === 'num'
      ) {
        const d = node as TextDirective
        const name: string | undefined = d.attributes?.name

        const reset: string | undefined = d.attributes?.reset
        const def: string | undefined = d.attributes?.define
        const up: string | undefined = d.attributes?.up
        const look: string | undefined = d.attributes?.look

        if (
          name &&
          (reset !== undefined ||
            def !== undefined ||
            up !== undefined ||
            look !== undefined)
        ) {
          // 属性に name と何かが指定されているときだけ.
          const parentsLen = parents.length
          const parent: Parent = parents[parentsLen - 1]
          const nodeIdx = parent.children.findIndex((n) => n === node)

          let replace: Text | undefined = undefined
          if (reset !== undefined) {
            // reset は値を設定するだけ(node は削除される)
            numners[name] = toSafeInteger(reset)
          } else if (def !== undefined) {
            // def は def された回数を値として設定、そのまま値をテキストとして扱う.
            const defCnt = defineCounter.up()
            numners[name] = defCnt
            replace = { type: 'text', value: `${defCnt}` }
          } else if (up !== undefined) {
            // up はカウントアップし、値をテキストとして扱う.
            // 定義されていない場合はエラーメッセージ.
            let v = numners[name]
            if (v !== undefined) {
              v++
              replace = { type: 'text', value: `${v}` }
              numners[name] = v
            } else {
              replace = errMessageNotDefined(name)
            }
          } else if (look !== undefined) {
            // look はカウント中の値を参照しテキストとして扱う
            // 定義されていない場合はエラーメッセージ.
            if (numners[name] !== undefined) {
              replace = { type: 'text', value: `${numners[name]}` }
            } else {
              replace = errMessageNotDefined(name)
            }
          }

          if (replace) {
            parent.children[nodeIdx] = replace
            return SKIP
          }
          parent.children.splice(nodeIdx, 1)
          return CONTINUE
        }
      }
    }

    const visitorPost = (node: Node, parents: Parent[]) => {
      const d = node as TextDirective
      const name: string | undefined = d.attributes?.name

      if (name) {
        // name 属性が指定されているときだけ.
        const parentsLen = parents.length
        const parent: Parent = parents[parentsLen - 1]
        const nodeIdx = parent.children.findIndex((n) => n === node)

        let replace: Text | undefined = undefined

        // pre で確定した値を参照しテキストとして扱う.
        // 定義されていない場合はエラーメッセージ.
        if (numners[name] !== undefined) {
          replace = { type: 'text', value: `${numners[name]}` }
        } else {
          replace = errMessageNotDefined(name)
        }

        if (replace) {
          parent.children[nodeIdx] = replace
          return SKIP
        }
        parent.children.splice(nodeIdx, 1)
        return CONTINUE
      }
    }

    // 常処理、reset の設定などが実行される
    visitParents(tree, visitTestPre, visitorPre)
    // 通常処理、define などが実行される
    visitParents(tree, visitor)
    // 後処理、確定されている変数を参照する.
    visitParents(tree, visitTest, visitorPost)
  }
}
