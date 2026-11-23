import { render, screen } from '@testing-library/react';
import { SelectField, TextField } from './Field';

// Regression for BUG-01-002: caller-supplied aria-describedby must not replace the error link.
describe('field descriptions', () => {
  it('TextField keeps both the error and the caller description', () => {
    render(
      <>
        <p id="extra">Extra help</p>
        <TextField label="Code" error="Required" aria-describedby="extra" />
      </>,
    );
    expect(screen.getByLabelText('Code')).toHaveAccessibleDescription('Required Extra help');
  });

  it('SelectField keeps both the error and the caller description', () => {
    render(
      <>
        <p id="extra2">Pick one</p>
        <SelectField label="Category" error="Choose a valid category" aria-describedby="extra2">
          <option value="">—</option>
        </SelectField>
      </>,
    );
    expect(screen.getByLabelText('Category')).toHaveAccessibleDescription('Choose a valid category Pick one');
  });

  it('has no description when there is no error, hint or caller id', () => {
    render(<TextField label="Plain" />);
    expect(screen.getByLabelText('Plain')).not.toHaveAttribute('aria-describedby');
  });
});
