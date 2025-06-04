import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User } from '../../core/models/User';
import { UserPreferences } from '../../core/models/UserPreferences';

export interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'LOGOUT' };

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'UPDATE_PREFERENCES':
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...state.user.preferences,
            ...action.payload,
          },
        },
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };

    default:
      return state;
  }
}

export interface UserContextValue {
  state: UserState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First, try to get user data without token (for development bypass)
        let response = await fetch('/api/v1/auth/me');

        if (response.ok) {
          // Authentication bypass is working
          const user = await response.json();
          dispatch({ type: 'SET_USER', payload: user });
          return;
        }

        // If that fails, try with token
        const token = localStorage.getItem('mosaic-auth-token');
        if (!token) {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // Validate token and get user data
        response = await fetch('/api/v1/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const user = await response.json();
          dispatch({ type: 'SET_USER', payload: user });
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('mosaic-auth-token');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('mosaic-auth-token');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const { user, token } = await response.json();

      // Store token
      localStorage.setItem('mosaic-auth-token', token);

      // Set user in state
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const logout = (): void => {
    // Remove token
    localStorage.removeItem('mosaic-auth-token');

    // Clear user state
    dispatch({ type: 'LOGOUT' });
  };

  const updatePreferences = async (preferences: Partial<UserPreferences>): Promise<void> => {
    if (!state.user) {
      throw new Error('User not authenticated');
    }

    try {
      const token = localStorage.getItem('mosaic-auth-token');
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update preferences');
      }

      const updatedPreferences = await response.json();

      // Update local state
      dispatch({ type: 'UPDATE_PREFERENCES', payload: updatedPreferences });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update preferences';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!state.isAuthenticated) return;

    try {
      const token = localStorage.getItem('mosaic-auth-token');
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        dispatch({ type: 'SET_USER', payload: user });
      } else {
        // Token is invalid, logout
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const value: UserContextValue = {
    state,
    login,
    logout,
    updatePreferences,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
