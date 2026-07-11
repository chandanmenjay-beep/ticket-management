/** @vitest-environment jsdom */
import { screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNavigate } from 'react-router-dom';
import Users from './Users';
import { renderWithProviders, queryClient } from '../test-utils';
import axios from 'axios';
import { useSession } from '../lib/auth.client';

// Mock the dependencies
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../lib/auth.client', () => ({
  useSession: vi.fn(),
  authClient: {
    admin: {
      createUser: vi.fn(),
    },
  },
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Users Component', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockNavigate = vi.fn();
    (useNavigate as any).mockReturnValue(mockNavigate);
    queryClient.clear();
  });

  it('renders skeleton loader when session is pending', () => {
    (useSession as any).mockReturnValue({ data: null, isPending: true });
    
    const { container } = renderWithProviders(<Users />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('redirects to /login if no session exists', async () => {
    (useSession as any).mockReturnValue({ data: null, isPending: false });
    
    renderWithProviders(<Users />);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('redirects to / if user is not an admin', async () => {
    (useSession as any).mockReturnValue({ 
      data: { user: { role: 'agent' } }, 
      isPending: false 
    });
    
    renderWithProviders(<Users />);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('renders users table for admin', async () => {
    (useSession as any).mockReturnValue({ 
      data: { user: { role: 'admin' } }, 
      isPending: false 
    });
    
    const mockUsers = [
      { id: '1', name: 'Alice Admin', email: 'alice@example.com', role: 'admin', createdAt: '2026-06-25T10:00:00Z' },
      { id: '2', name: 'Bob Agent', email: 'bob@example.com', role: 'agent', createdAt: '2026-06-25T11:00:00Z' }
    ];
    
    (axios.get as any).mockResolvedValue({ data: mockUsers });
    
    renderWithProviders(<Users />);
    
    expect(await screen.findByText('Users')).toBeInTheDocument();
    
    expect(await screen.findByText('Alice Admin')).toBeInTheDocument();
    expect(await screen.findByText('alice@example.com')).toBeInTheDocument();
    expect(await screen.findByText('Bob Agent')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    (useSession as any).mockReturnValue({ 
      data: { user: { role: 'admin' } }, 
      isPending: false 
    });
    
    (axios.get as any).mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<Users />);
    
    expect(await screen.findByText('Error loading users')).toBeInTheDocument();
  });

  it('opens modal on create user click, and closes on backdrop click and Escape key', async () => {
    (useSession as any).mockReturnValue({ 
      data: { user: { role: 'admin' } }, 
      isPending: false 
    });
    (axios.get as any).mockResolvedValue({ data: [] });
    
    renderWithProviders(<Users />);
    
    expect(await screen.findByText('Users')).toBeInTheDocument();
    
    // 1. Open modal and close via backdrop
    const createBtn = await screen.findByTestId('create-user-btn');
    fireEvent.click(createBtn);
    expect(await screen.findByText('Create New User')).toBeInTheDocument();
    
    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);
    await waitFor(() => {
      expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
    });

    // 2. Open modal again and close via Escape
    fireEvent.click(createBtn);
    expect(await screen.findByText('Create New User')).toBeInTheDocument();
    
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
    });
  });
});
