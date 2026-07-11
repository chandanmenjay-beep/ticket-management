/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import TicketDetails from '../TicketDetails';
import { useSession } from '../../lib/auth.client';

// Mock Dependencies
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  }
}));

vi.mock('../../lib/auth.client', () => ({
  useSession: vi.fn(),
}));

// Mock framer-motion to avoid animation delays in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockTicketData = {
  id: 'ticket_123',
  subject: 'Test Subject',
  status: 'open',
  category: 'technical',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  customer: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  assignedTo: {
    id: 'agent_1',
    name: 'Agent Smith',
    email: 'smith@example.com',
  },
  messages: [
    {
      id: 'msg_1',
      bodyText: 'First message',
      senderType: 'CUSTOMER',
      senderId: 'customer_1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'msg_2',
      bodyText: 'Agent reply',
      senderType: 'AGENT',
      senderId: 'agent_2',
      createdAt: new Date().toISOString(),
    }
  ]
};

const mockUsersData = [
  { id: 'agent_1', name: 'Agent Smith', email: 'smith@example.com', role: 'agent' },
  { id: 'agent_2', name: 'Admin Jane', email: 'jane@example.com', role: 'admin' },
];

describe('TicketDetails Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Default mock session
    (useSession as any).mockReturnValue({
      data: { user: { id: 'agent_1', name: 'Agent Smith' } },
      isPending: false,
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  const renderComponent = (ticketId = 'ticket_123') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
          <Routes>
            <Route path="/tickets/:id" element={<TicketDetails />} />
            <Route path="/" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should render loading state initially', () => {
    (useSession as any).mockReturnValue({ isPending: true });
    const { container } = renderComponent();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render "Ticket Not Found" on error', async () => {
    (axios.get as any).mockRejectedValue(new Error('Not found'));
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Ticket Not Found')).toBeInTheDocument();
      expect(screen.getByText("The ticket you are looking for does not exist or you don't have access.")).toBeInTheDocument();
    });
  });

  it('should successfully render ticket details and message thread', async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/users')) return Promise.resolve({ data: mockUsersData });
      return Promise.resolve({ data: mockTicketData });
    });

    renderComponent();

    // Check title and customer data
    await waitFor(() => {
      expect(screen.getByText('Test Subject')).toBeInTheDocument();
    });
    
    expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
    expect(screen.getByText('(john@example.com)', { exact: false })).toBeInTheDocument();

    // Check messages
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Agent reply')).toBeInTheDocument();

    // Edge Case check: Dynamic Agent Name Matching
    // msg_1 is CUSTOMER (John Doe)
    // msg_2 is AGENT (senderId agent_2 -> Admin Jane)
    // There are actually multiple elements with John Doe, but let's check Admin Jane is rendered in thread
    expect(screen.getAllByText('Admin Jane')[0]).toBeInTheDocument();
  });

  it('should render "No messages yet" if thread is empty', async () => {
    const emptyTicketData = { ...mockTicketData, messages: [] };
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/users')) return Promise.resolve({ data: mockUsersData });
      return Promise.resolve({ data: emptyTicketData });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No messages yet. Be the first to reply.')).toBeInTheDocument();
    });
  });

  it('should handle replying to a ticket', async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/users')) return Promise.resolve({ data: mockUsersData });
      return Promise.resolve({ data: mockTicketData });
    });
    (axios.post as any).mockResolvedValue({ data: { id: 'new_msg' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your reply here...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Type your reply here...');
    const submitBtn = screen.getByRole('button', { name: /Send Reply/i });

    // Button should be disabled initially (edge case)
    expect(submitBtn).toBeDisabled();

    // Type a message
    fireEvent.change(textarea, { target: { value: 'This is a new reply' } });
    
    // Button should now be enabled
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });

    // Submit
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/tickets/ticket_123/messages', {
        bodyText: 'This is a new reply'
      });
    });
  });

  it('should disable Polish button if reply text is empty', async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/users')) return Promise.resolve({ data: mockUsersData });
      return Promise.resolve({ data: mockTicketData });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your reply here...')).toBeInTheDocument();
    });

    const polishBtn = screen.getByRole('button', { name: /Polish/i });
    expect(polishBtn).toBeDisabled();
  });

  it('should call AI Polish API and update reply text on success', async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/users')) return Promise.resolve({ data: mockUsersData });
      return Promise.resolve({ data: mockTicketData });
    });
    
    // Mock successful AI polish
    (axios.post as any).mockResolvedValue({ data: { polishedText: 'Polished AI text' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your reply here...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Type your reply here...');
    const polishBtn = screen.getByRole('button', { name: /Polish/i });

    // Type a message
    fireEvent.change(textarea, { target: { value: 'rough text' } });
    
    await waitFor(() => {
      expect(polishBtn).not.toBeDisabled();
    });

    // Click Polish
    fireEvent.click(polishBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/ai/polish', {
        text: 'rough text'
      });
    });

    // Textarea should be updated with polished text
    await waitFor(() => {
      expect(textarea).toHaveValue('Polished AI text');
    });
  });

  it('should handle AI Polish API error gracefully', async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/users')) return Promise.resolve({ data: mockUsersData });
      return Promise.resolve({ data: mockTicketData });
    });
    
    // Mock failing AI polish
    (axios.post as any).mockRejectedValue(new Error('AI Failed'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your reply here...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Type your reply here...');
    const polishBtn = screen.getByRole('button', { name: /Polish/i });

    // Type a message
    fireEvent.change(textarea, { target: { value: 'rough text' } });
    
    await waitFor(() => {
      expect(polishBtn).not.toBeDisabled();
    });

    // Click Polish
    fireEvent.click(polishBtn);

    // Wait for the mutation to settle (button becomes enabled again after failure)
    await waitFor(() => {
      expect(polishBtn).not.toBeDisabled();
    });

    // Textarea should NOT have changed if there was an error
    expect(textarea).toHaveValue('rough text');
  });

  it('should update ticket status via dropdown', async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/users')) return Promise.resolve({ data: mockUsersData });
      return Promise.resolve({ data: mockTicketData });
    });
    (axios.patch as any).mockResolvedValue({ data: { ...mockTicketData, status: 'resolved' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Subject')).toBeInTheDocument();
    });

    // Find the Status select
    const selects = screen.getAllByRole('combobox');
    // Status is the first select in the sidebar (Status, Category, Assigned To)
    const statusSelect = selects[0];

    fireEvent.change(statusSelect, { target: { value: 'resolved' } });

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith('/api/tickets/ticket_123', {
        status: 'resolved'
      });
    });
  });
});
