import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock react-dom/client
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
  render: mockRender,
}));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mockCreateRoot,
  },
  createRoot: mockCreateRoot,
}));

// Mock React
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    StrictMode: ({ children }) => children,
  };
});

// Mock the App component
vi.mock('../App', () => ({
  default: () => 'App',
}));

// Mock CSS imports
vi.mock('../index.css', () => ({}));

// Mock socketService
vi.mock('../services/socketService', () => ({
  socketService: {
    connect: vi.fn(),
  },
}));

// Mock store
vi.mock('../store', () => ({
  store: {},
}));

describe('main.jsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.getElementById
    const mockElement = document.createElement('div');
    mockElement.id = 'root';
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);
  });

  it('should render the app without crashing', async () => {
    // Import the main module to trigger the execution
    await import('../main.jsx');

    expect(document.getElementById).toHaveBeenCalledWith('root');
    expect(mockCreateRoot).toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalled();
  });
});
