import { Plugin, Transformer } from 'unified'
import { Node } from 'unist'
import { Parent, Root, Text } from 'mdast'
import { TextDirective, ContainerDirective } from 'mdast-util-directive'
import { visitParents, SKIP } from 'unist-util-visit-parents'
import toSafeInteger from 'lodash.tosafeinteger'

const directiveName = 'cnt'

export type RemarkCounterOptions = {}

export type SimpleCounterTrigger = { type: string; depth: number }
export class SimpleCounter {
  private counter: number = 0
  private resetTrigger: SimpleCounterTrigger[] = []
  private incrementTrigger: SimpleCounterTrigger[] = []
  constructor() {}
  addResetTrigger(t?: SimpleCounterTrigger) {
    if (t) {
      this.resetTrigger.push({ type: t.type, depth: t.depth })
    }
  }
  addIncrementTrigger(t?: SimpleCounterTrigger) {
    if (t) {
      this.incrementTrigger.push({ type: t.type, depth: t.depth })
    }
  }
  set(value: number) {
    this.counter = value
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
  incerement(node: Node): boolean {
    if (
      this.incrementTrigger.findIndex(
        ({ type, depth }) => type === node.type && depth === (node as any).depth
      ) >= 0
    ) {
      this.up()
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

export class Counter {
  private counters: Record<string, SimpleCounter> = {}
  constructor() {}
  define(name: string, t?: SimpleCounterTrigger) {
    if (this.counters[name] === undefined) {
      this.counters[name] = new SimpleCounter()
      this.counters[name].addResetTrigger(t)
    } else {
      this.counters[name].addResetTrigger(t)
    }
  }
  addIncrementTrigger(name: string, t?: SimpleCounterTrigger): boolean {
    if (this.counters[name]) {
      this.counters[name].addIncrementTrigger(t)
      return true
    }
    return false
  }
  set(name: string, value: number) {
    if (this.counters[name]) {
      this.counters[name].set(value)
    }
  }
  up(name: string): number | undefined {
    if (this.counters[name]) {
      return this.counters[name].up()
    }
    return undefined
  }
  look(name: string): number | undefined {
    if (this.counters[name]) {
      return this.counters[name].look()
    }
    return undefined
  }
  trigger(node: Node) {
    Object.values(this.counters).forEach((v) => v.reset(node))
    Object.values(this.counters).forEach((v) => v.incerement(node))
  }
}

export function errMessageNotDefined(name: string): Text {
  return {
    type: 'text',
    value: `(ReferenceError: "${name}" is not defined)`
  }
}

export const remarkCounter: Plugin<
  [RemarkCounterOptions] | [RemarkCounterOptions[]] | [],
  string,
  Root
> = function remarkCounter(): Transformer {
  // ????????????(reset ???????????????)???.
  const visitTestPre = (node: Node) => {
    if (
      node.type === 'containerDirective' &&
      (node as ContainerDirective).name === directiveName
    ) {
      return true
    }
    return false
  }
  return function transformer(tree: Node): void {
    const counter = new Counter()

    const visitorPre = (node: Node, parents: Parent[]) => {
      const d = node as ContainerDirective
      if (d.attributes?.reset !== undefined) {
        // reset ?????????.
        const parentsLen = parents.length
        const parent: Parent = parents[parentsLen - 1]
        const nodeIdx = parent.children.findIndex((n) => n === node)
        // ??????????????? paragraph ??? heading ????????????.
        d.children.forEach((n) => {
          if (
            n.type == 'paragraph' &&
            n.children.length === 1 &&
            n.children[0].type === 'textDirective' &&
            n.children[0].name === directiveName &&
            n.children[0].attributes?.name
          ) {
            counter.define(n.children[0].attributes?.name)
          } else if (
            n.type == 'heading' &&
            n.children.length === 1 &&
            n.children[0].type === 'textDirective' &&
            n.children[0].name === directiveName &&
            n.children[0].attributes?.name
          ) {
            counter.define(n.children[0].attributes?.name, {
              type: n.type,
              depth: n.depth
            })
          }
        })
        parent.children.splice(nodeIdx, 1)
        return nodeIdx
      } else if (d.attributes?.increment !== undefined) {
        // increment ?????????.
        const parentsLen = parents.length
        const parent: Parent = parents[parentsLen - 1]
        const nodeIdx = parent.children.findIndex((n) => n === node)
        // ??????????????? heading ????????????.
        let replace: Text | undefined = undefined
        d.children.forEach((n) => {
          if (
            n.type == 'heading' &&
            n.children.length === 1 &&
            n.children[0].type === 'textDirective' &&
            n.children[0].name === directiveName &&
            n.children[0].attributes?.name
          ) {
            const name = n.children[0].attributes.name
            if (
              counter.addIncrementTrigger(name, {
                type: n.type,
                depth: n.depth
              }) === false
            ) {
              replace = errMessageNotDefined(name)
            }
          }
        })
        if (replace) {
          parent.children[nodeIdx] = replace
          return SKIP
        }
        parent.children.splice(nodeIdx, 1)
        return nodeIdx
      }
    }

    const visitor = (node: Node, parents: Parent[]) => {
      counter.trigger(node) // ????????????????????????????????????.

      // visitTest ????????????????????????????????????????????????????????????.
      if (
        node.type === 'textDirective' &&
        (node as TextDirective).name === directiveName
      ) {
        const d = node as TextDirective
        const name: string | undefined = d.attributes?.name

        const reset: string | undefined = d.attributes?.reset
        const up: string | undefined = d.attributes?.up
        const look: string | undefined = d.attributes?.look

        if (name) {
          // ????????? name ????????????????????????????????????.
          const parentsLen = parents.length
          const parent: Parent = parents[parentsLen - 1]
          const nodeIdx = parent.children.findIndex((n) => n === node)

          let replace: Text | undefined = undefined
          if (reset !== undefined) {
            // reset ???????????????????????????(node ??????????????????)

            counter.define(name)
            counter.set(name, toSafeInteger(reset))
          } else if (up !== undefined) {
            // up ???????????????????????????????????????????????????????????????.
            // ?????????????????????????????????????????????????????????.
            const v = counter.up(name)
            if (v !== undefined) {
              replace = { type: 'text', value: `${v}` }
            } else {
              replace = errMessageNotDefined(name)
            }
          } else if (look !== undefined) {
            // look ???????????????????????????????????????????????????????????????
            // ?????????????????????????????????????????????????????????.
            const v = counter.look(name)
            if (v !== undefined) {
              replace = { type: 'text', value: `${v}` }
            } else {
              replace = errMessageNotDefined(name)
            }
          } else {
            // ?????????????????? name ????????? look ?????????.
            // ?????????????????????????????????????????????????????????.
            const v = counter.look(name)
            if (v !== undefined) {
              replace = { type: 'text', value: `${v}` }
            } else {
              replace = errMessageNotDefined(name)
            }
          }

          if (replace) {
            parent.children[nodeIdx] = replace
            return SKIP
          }
          parent.children.splice(nodeIdx, 1)
          return nodeIdx
        }
      }
    }

    // ????????????reset ?????????????????????????????????
    visitParents(tree, visitTestPre, visitorPre)
    // ???????????????up ????????????????????????
    visitParents(tree, visitor)
  }
}
