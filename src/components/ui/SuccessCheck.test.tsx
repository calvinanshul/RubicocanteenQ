import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SuccessCheck } from './SuccessCheck';

describe('SuccessCheck', () => {
  it('is decorative and sized from the prop', () => {
    render(<SuccessCheck size={120} />);
    const svg = screen.getByTestId('success-check');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '120');
    expect(svg.querySelector('.success-check__tick')).not.toBeNull();
  });

  it('gives each instance its own gradient ids, so two on one page do not clash', () => {
    render(
      <>
        <SuccessCheck />
        <SuccessCheck />
      </>,
    );
    const ids = Array.from(document.querySelectorAll('linearGradient')).map((g) => g.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    for (const id of ids) expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    const fills = screen.getAllByTestId('success-check').map((s) => s.querySelector('.success-check__disc')?.getAttribute('fill'));
    expect(fills[0]).not.toBe(fills[1]);
  });
});
