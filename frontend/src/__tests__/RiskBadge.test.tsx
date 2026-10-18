import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskBadge } from '../components/RiskBadge';

describe('RiskBadge Component', () => {
  it('renders High Risk with correct accessible label and score', () => {
    render(<RiskBadge category="High Risk" score={0.88} showScore={true} />);
    expect(screen.getByText('High Risk')).toBeDefined();
    expect(screen.getByText('(88%)')).toBeDefined();
  });

  it('renders Medium Risk badge correctly', () => {
    render(<RiskBadge category="Medium Risk" score={0.52} showScore={true} />);
    expect(screen.getByText('Medium Risk')).toBeDefined();
    expect(screen.getByText('(52%)')).toBeDefined();
  });

  it('renders Low Risk badge correctly', () => {
    render(<RiskBadge category="Low Risk" score={0.15} showScore={true} />);
    expect(screen.getByText('Low Risk')).toBeDefined();
    expect(screen.getByText('(15%)')).toBeDefined();
  });

  it('renders Unassessed fallback safely', () => {
    render(<RiskBadge category="Unassessed" />);
    expect(screen.getByText('Unassessed')).toBeDefined();
  });
});
