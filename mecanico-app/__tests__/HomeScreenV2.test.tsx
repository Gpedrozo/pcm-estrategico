import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import HomeScreenV2 from '../src/screens/HomeScreenV2';

const mockNavigate = jest.fn();

jest.mock('../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    empresaId: 'empresa-1',
    mecanicoId: 'mec-1',
    mecanicoNome: 'João Mecânico',
    mecanicoCodigo: 'MEC123',
    logout: jest.fn(),
  })),
}));

const query = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  then: jest.fn().mockResolvedValue({ data: [], error: null }),
};

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => query),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('HomeScreenV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dashboard header and allows navigation to notifications and profile', async () => {
    const { getByText } = render(<HomeScreenV2 />);

    await waitFor(() => {
      expect(getByText('PCM Mecânico')).toBeTruthy();
    });

    fireEvent.press(getByText('🔔'));
    expect(mockNavigate).toHaveBeenCalledWith('Notifications');

    fireEvent.press(getByText('👤'));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('fetches open orders on mount', async () => {
    render(<HomeScreenV2 />);
    await waitFor(() => {
      expect(query.select).toHaveBeenCalledWith('*');
    });
  });
});
