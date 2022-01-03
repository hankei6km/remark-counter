import { unified } from 'unified'
import { Node } from 'unist'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkDirective from 'remark-directive'
import {
  SimpleCounter,
  remarkCounter,
  RemarkCounterOptions,
  Counter
} from '../../src/lib/counter.js'

describe('DefineCounter', () => {
  it('should count up counter', async () => {
    const counter = new SimpleCounter()
    expect(counter.up()).toEqual(1)
    expect(counter.up()).toEqual(2)
    expect(counter.look()).toEqual(2)
  })
  it('should reset counter by node', async () => {
    const counter = new SimpleCounter()
    counter.addResetTrigger({ type: 'heading', depth: 2 })
    expect(counter.up()).toEqual(1)
    expect(counter.reset({ type: 'heading', depth: 2 } as Node)).toBeTruthy()
    expect(counter.up()).toEqual(1)
    expect(counter.reset({ type: 'heading', depth: 3 } as Node)).toBeFalsy()
    expect(counter.up()).toEqual(2)
  })
  it('should increment counter by node', async () => {
    const counter = new SimpleCounter()
    counter.addIncrementTrigger({ type: 'heading', depth: 2 })
    expect(counter.look()).toEqual(0)
    expect(
      counter.incerement({ type: 'heading', depth: 2 } as Node)
    ).toBeTruthy()
    expect(counter.look()).toEqual(1)
    expect(
      counter.incerement({ type: 'heading', depth: 3 } as Node)
    ).toBeFalsy()
    expect(counter.look()).toEqual(1)
  })
})

describe('Counter', () => {
  it('should define variables', async () => {
    const numbers = new Counter()
    numbers.define('foo')
    numbers.define('bar')
    expect(numbers.look('foo')).toEqual(0)
    expect(numbers.look('bar')).toEqual(0)
  })
  it('should count up variables', async () => {
    const numbers = new Counter()
    numbers.define('foo')
    numbers.define('bar')
    numbers.up('foo')
    expect(numbers.look('foo')).toEqual(1)
    expect(numbers.look('bar')).toEqual(0)
    numbers.up('bar')
    expect(numbers.look('foo')).toEqual(1)
    expect(numbers.look('bar')).toEqual(1)
  })
  it('should reset counter by node', async () => {
    const numbers = new Counter()
    numbers.define('foo', { type: 'heading', depth: 2 })
    numbers.define('bar', { type: 'heading', depth: 3 })
    expect(numbers.look('foo')).toEqual(0)
    expect(numbers.look('bar')).toEqual(0)
    numbers.up('foo')
    numbers.up('bar')
    expect(numbers.look('foo')).toEqual(1)
    expect(numbers.look('bar')).toEqual(1)
    numbers.trigger({ type: 'heading', depth: 2 } as Node)
    expect(numbers.look('foo')).toEqual(0)
    expect(numbers.look('bar')).toEqual(1)
    numbers.up('foo')
    numbers.up('bar')
    expect(numbers.look('foo')).toEqual(1)
    expect(numbers.look('bar')).toEqual(2)
    numbers.trigger({ type: 'heading', depth: 3 } as Node)
    expect(numbers.look('foo')).toEqual(1)
    expect(numbers.look('bar')).toEqual(0)
  })
  it('should increment counter by node', async () => {
    const numbers = new Counter()
    numbers.define('foo')
    numbers.define('bar')
    numbers.addIncrementTrigger('foo', { type: 'heading', depth: 2 })
    numbers.addIncrementTrigger('bar', { type: 'heading', depth: 3 })
    expect(numbers.look('foo')).toEqual(0)
    expect(numbers.look('bar')).toEqual(0)
    numbers.trigger({ type: 'heading', depth: 2 } as Node)
    expect(numbers.look('foo')).toEqual(1)
    expect(numbers.look('bar')).toEqual(0)
    numbers.trigger({ type: 'heading', depth: 3 } as Node)
    expect(numbers.look('foo')).toEqual(1)
    expect(numbers.look('bar')).toEqual(1)
  })
  it('should reset and increment counter by node', async () => {
    const numbers = new Counter()
    numbers.define('foo', { type: 'heading', depth: 2 })
    numbers.define('bar', { type: 'heading', depth: 3 })
    numbers.addIncrementTrigger('foo', { type: 'heading', depth: 2 })
    numbers.addIncrementTrigger('bar', { type: 'heading', depth: 3 })
    numbers.up('foo')
    numbers.up('bar')
    numbers.up('foo')
    numbers.up('bar')
    expect(numbers.look('foo')).toEqual(2)
    expect(numbers.look('bar')).toEqual(2)
    numbers.trigger({ type: 'heading', depth: 2 } as Node)
    expect(numbers.look('foo')).toEqual(1)
    expect(numbers.look('bar')).toEqual(2)
    numbers.up('foo')
    numbers.up('bar')
    expect(numbers.look('foo')).toEqual(2)
    expect(numbers.look('bar')).toEqual(3)
    numbers.trigger({ type: 'heading', depth: 3 } as Node)
    expect(numbers.look('foo')).toEqual(2)
    expect(numbers.look('bar')).toEqual(1)
  })
})

describe('remarkNumbers()', () => {
  const f = async (
    html: string,
    opts?: RemarkCounterOptions | RemarkCounterOptions[]
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      unified()
        .use(remarkParse)
        .use(remarkDirective)
        .use(remarkCounter)
        .use(remarkStringify)
        .freeze()
        .process(html, (err, file) => {
          if (err) {
            reject(err)
          }
          resolve(String(file))
        })
    })
  }
  it('should assign the value by "reset"', async () => {
    expect(
      await f(
        '# test\n\ns1\n:cnt{name="fig" reset}\ns2\n\n## test1\n\n![fig1](/images/fig1.png)\nfig :cnt{name="fig" up}\n'
      )
    ).toEqual(
      '# test\n\ns1\n\ns2\n\n## test1\n\n![fig1](/images/fig1.png)\nfig 1\n'
    )
  })
  it('should assign the value by "reset"(multiple)', async () => {
    expect(
      await f(
        '# test\n\n:cnt{name="foo" reset}\n:cnt{name="bar" reset}\n\n:cnt{name="foo" up}\n\n:cnt{name="bar" up}\n\n:cnt{name="bar" up}\n\n:cnt{name="bar" up}\n\n:cnt{name="foo" up}\n'
      )
    ).toEqual('# test\n\n\n\n\n1\n\n1\n\n2\n\n3\n\n2\n')
  })
  it('should increment the value by "up"', async () => {
    expect(
      await f(
        '# test\n\n:cnt{name="fig" reset}\n\n:cnt{name="fig" up}\n\n:cnt{name="fig" up}\n'
      )
    ).toEqual('# test\n\n\n\n1\n\n2\n')
  })
  it('should reset by reset container', async () => {
    expect(
      await f(
        '# test\n\n:::cnt{reset}\n## :cnt{name="foo"}\n## :cnt{name="bar"}\n### :cnt{name="bar"}\n:::\n\n## head2-1\n\n:cnt{name="foo" up}:cnt{name="bar" up}\n\n### head3-1\n\n:cnt{name="foo" up}:cnt{name="bar" up}\n\n## head2-2\n\n:cnt{name="foo" up}:cnt{name="bar" up}\n'
      )
    ).toEqual(
      '# test\n\n## head2-1\n\n11\n\n### head3-1\n\n21\n\n## head2-2\n\n11\n'
    )
  })
  it('should increment values by increment container', async () => {
    expect(
      await f(
        '# test\n\n:::cnt{reset}\n# :cnt{name="chapter"}\n:::\n:::cnt{increment}\n## :cnt{name="chapter"}\n:::\n\n## test 1\n\n:cnt{name="chapter"}\n\n### test1-1\n\n:cnt{name="chapter"}\n\n## test2\n\n:cnt{name="chapter"}\n'
      )
    ).toEqual('# test\n\n## test 1\n\n1\n\n### test1-1\n\n1\n\n## test2\n\n2\n')
  })
  it('should lookup variable', async () => {
    expect(
      await f(
        '# test\n\n:cnt{name="foo" reset}\n\n:cnt{name="foo" up}\n\n:cnt{name="foo" look}:cnt{name="foo"}\n\n:cnt{name="foo" up}\n'
      )
    ).toEqual('# test\n\n\n\n1\n\n11\n\n2\n')
  })
  it('should insert a error message if the value is not defined', async () => {
    expect(
      await f(
        '# test\n\n:cnt{name="foo" reset}\n\ns1:cnt{name="bar" up}s2\n\ns3:cnt{name="car" look}s4\n\ns5:cnt{name="baz"}s6\n\n:cnt{name="foo" up}\n'
      )
    ).toEqual(
      '# test\n\n\n\ns1(ReferenceError: "bar" is not defined)s2\n\ns3(ReferenceError: "car" is not defined)s4\n\ns5(ReferenceError: "baz" is not defined)s6\n\n1\n'
    )
    expect(
      await f(
        '# test\n\n:::cnt{increment}\n## :cnt{name="chapter"}\n:::\n## test1\n'
      )
    ).toEqual(
      '# test\n\n(ReferenceError: "chapter" is not defined)\n\n## test1\n'
    )
  })
  it('should escape varble name in error message', async () => {
    expect(await f('# test\n\ns1:cnt{name="[bar]"}s2\n')).toEqual(
      '# test\n\ns1(ReferenceError: "\\[bar]" is not defined)s2\n'
    )
  })
})
