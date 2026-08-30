import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styleSource = readFileSync(resolve('src/style.css'), 'utf8')

describe('global input affix spacing', () => {
  it('preserves Tailwind left and right padding utilities against typed input selectors', () => {
    const remByStep: Record<number, string> = {
      6: '1.5rem',
      7: '1.75rem',
      8: '2rem',
      9: '2.25rem',
      10: '2.5rem',
      11: '2.75rem',
      12: '3rem'
    }

    for (const [step, rem] of Object.entries(remByStep)) {
      expect(styleSource).toContain(`.input.pl-${step}, input.pl-${step}`)
      expect(styleSource).toContain(`padding-left: ${rem} !important`)
      expect(styleSource).toContain(`.input.pr-${step}, input.pr-${step}`)
      expect(styleSource).toContain(`padding-right: ${rem} !important`)
    }
  })
})
