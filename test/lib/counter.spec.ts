import { unified } from 'unified'
import { Node } from 'unist'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkDirective from 'remark-directive'
import {
  DefineCounter,
  remarkCounter,
  RemarkNumbersOptions
} from '../../src/lib/counter'

describe('DefineCounter', () => {
  it('should count up counter', async () => {
    const counter = new DefineCounter()
    expect(counter.up()).toEqual(1)
    expect(counter.up()).toEqual(2)
    expect(counter.look()).toEqual(2)
  })
  it('should reset counter', async () => {
    const counter = new DefineCounter()
    counter.addResetTrigger({ type: 'heading', depth: 2 })
    expect(counter.up()).toEqual(1)
    expect(counter.reset({ type: 'heading', depth: 2 } as Node)).toBeTruthy()
    expect(counter.up()).toEqual(1)
    expect(counter.reset({ type: 'heading', depth: 3 } as Node)).toBeFalsy()
    expect(counter.up()).toEqual(2)
  })
})

describe('remarkNumbers()', () => {
  const f = async (
    html: string,
    opts?: RemarkNumbersOptions | RemarkNumbersOptions[]
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
        '# test\n\ns1\n:num{name="fig" reset}\ns2\n\n## test1\n\n![fig1](/images/fig1.png)\nfig :num{name="fig" up}\n'
      )
    ).toEqual(
      '# test\n\ns1\n\ns2\n\n## test1\n\n![fig1](/images/fig1.png)\nfig 1\n'
    )
  })
  it('should assign the value by "reset"(multiple)', async () => {
    expect(
      await f(
        '# test\n\n:num{name="foo" reset}\n:num{name="bar" reset}\n\n:num{name="foo" up}\n\n:num{name="bar" up}\n\n:num{name="bar" up}\n\n:num{name="bar" up}\n\n:num{name="foo" up}\n'
      )
    ).toEqual('# test\n\n\n\n\n1\n\n1\n\n2\n\n3\n\n2\n')
  })
  it('should assign the value by "define"', async () => {
    expect(
      await f(
        '# test\n\ns1\n\n![fig1](/images/fig1.png)\n*fig :num{name="fig" define}*\n\ns2\n\n## test1\n\nfig :num{name="fig"}\n'
      )
    ).toEqual(
      '# test\n\ns1\n\n![fig1](/images/fig1.png)\n*fig 1*\n\ns2\n\n## test1\n\nfig 1\n'
    )
  })
  it('should increment the value by "up"', async () => {
    expect(
      await f(
        '# test\n\n:num{name="fig" reset}\n\n:num{name="fig" up}\n\n:num{name="fig" up}\n'
      )
    ).toEqual('# test\n\n\n\n1\n\n2\n')
  })
  it('should increment the value by "define"', async () => {
    expect(
      await f(
        '# test\n\n:num{name="foo" define}\n\n:num{name="bar" define}\n\n:num{name="bar" define}\n'
      )
    ).toEqual('# test\n\n1\n\n2\n\n3\n')
  })
  it('should reset by reset container', async () => {
    expect(
      await f(
        '# test\n\n:::num{reset}\n## :num\n:::\n\n## head2-1\n\n:num{name="foo" define}\n\n:num{name="bar" define}\n\n## head2-2\n\n:num{name="car" define}\n\n## head2-3\n\n:num{name="foo"}:num{name="bar"}:num{name="car"}\n'
      )
    ).toEqual(
      '# test\n\n## head2-1\n\n1\n\n2\n\n## head2-2\n\n1\n\n## head2-3\n\n121\n'
    )
  })
  it('should lookup variable that is counter', async () => {
    expect(
      await f(
        '# test\n\n:num{name="foo" reset}\n\n:num{name="foo" up}\n\n:num{name="foo" look}\n\n:num{name="foo" up}\n'
      )
    ).toEqual('# test\n\n\n\n1\n\n1\n\n2\n')
  })
  it('should lookup variable that is define at post', async () => {
    expect(
      await f(
        '# test\n\n:num{name="foo" define}\n\n:nun{name="car"}\n\n:num{name="bar" define}\n\n:num{name="car" define}\n'
      )
    ).toEqual('# test\n\n1\n\n3\n\n2\n\n3\n')
  })
  it('should insert a error message if the value is not defined', async () => {
    expect(
      await f(
        '# test\n\n:num{name="foo" reset}\n\ns1:num{name="bar" up}s2\n\ns3:num{name="car" look}s4\n\n:num{name="foo" up}\n'
      )
    ).toEqual(
      '# test\n\n\n\ns1(ReferenceError: "bar" is not defined)s2\n\ns3(ReferenceError: "car" is not defined)s4\n\n1\n'
    )
    expect(
      await f(
        '# test\n\n:num{name="foo" define}\n\ns1:num{name="bar"}s2\n\n:num{name="foo"}\n'
      )
    ).toEqual(
      '# test\n\n1\n\ns1(ReferenceError: "bar" is not defined)s2\n\n1\n'
    )
  })
  it('should escape varble name in error message', async () => {
    expect(await f('# test\n\ns1:num{name="[bar]"}s2\n')).toEqual(
      '# test\n\ns1(ReferenceError: "\\[bar]" is not defined)s2\n'
    )
  })
})
