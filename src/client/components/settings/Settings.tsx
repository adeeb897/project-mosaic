import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import styles from './Settings.module.css';

interface ApiKeyConfig {
  provider: string;
  hasValidKey: boolean;
  usageCount: number;
}

export const Settings: React.FC = () => {
  const { state: userState } = useUser();
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availableProviders = [
    { id: 'anthropic', name: 'Anthropic Claude', description: 'Claude 3.5 Sonnet, Haiku, Opus models' },
    { id: 'openai', name: 'OpenAI GPT', description: 'GPT-4, GPT-3.5 models (Coming Soon)' },
    { id: 'google', name: 'Google Gemini', description: 'Gemini Pro models (Coming Soon)' },
  ];

  // Load configured API keys
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/v1/ai/providers/configured', {
          headers: {
            'Authorization': 'Bearer dev-token',
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const configuredProviders = await response.json();
          setApiKeys(configuredProviders);
        }
      } catch (error) {
        console.error('Failed to load API keys:', error);
        setMessage({ type: 'error', text: 'Failed to load API key configuration' });
      } finally {
        setIsLoading(false);
      }
    };

    loadApiKeys();
  }, []);

  // Handle API key submission
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newApiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);

      const response = await fetch(`/api/v1/ai/providers/${selectedProvider}/api-key`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: newApiKey.trim() }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `${availableProviders.find(p => p.id === selectedProvider)?.name} API key saved successfully!` });
        setNewApiKey('');

        // Reload API keys
        const configResponse = await fetch('/api/v1/ai/providers/configured', {
          headers: {
            'Authorization': 'Bearer dev-token',
            'Content-Type': 'application/json',
          },
        });

        if (configResponse.ok) {
          const configuredProviders = await configResponse.json();
          setApiKeys(configuredProviders);
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save API key' });
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      setMessage({ type: 'error', text: 'Failed to save API key. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle API key deletion
  const handleDeleteApiKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to delete the ${provider} API key?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/ai/providers/${provider}/api-key`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `${provider} API key deleted successfully` });
        setApiKeys(prev => prev.filter(key => key.provider !== provider));
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to delete API key' });
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setMessage({ type: 'error', text: 'Failed to delete API key. Please try again.' });
    }
  };

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <h1>Settings</h1>
        <p>Configure your AI providers and manage your API keys</p>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.section}>
        <h2>AI Provider Configuration</h2>
        <p className={styles.sectionDescription}>
          Add your API keys to enable AI-powered conversations. Your keys are encrypted and stored securely.
        </p>

        {/* Current API Keys */}
        <div className={styles.currentKeys}>
          <h3>Configured Providers</h3>
          {isLoading ? (
            <div className={styles.loading}>Loading API key configuration...</div>
          ) : apiKeys.length > 0 ? (
            <div className={styles.keysList}>
              {apiKeys.map(key => (
                <div key={key.provider} className={styles.keyItem}>
                  <div className={styles.keyInfo}>
                    <div className={styles.keyProvider}>
                      {availableProviders.find(p => p.id === key.provider)?.name || key.provider}
                    </div>
                    <div className={styles.keyStatus}>
                      <span className={styles.statusIndicator}>✅ Active</span>
                      <span className={styles.usageCount}>Used {key.usageCount} times</span>
                    </div>
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteApiKey(key.provider)}
                    aria-label={`Delete ${key.provider} API key`}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noKeys}>
              <p>No API keys configured yet. Add one below to start using AI features.</p>
            </div>
          )}
        </div>

        {/* Add New API Key */}
        <div className={styles.addKey}>
          <h3>Add New API Key</h3>
          <form onSubmit={handleSaveApiKey} className={styles.keyForm}>
            <div className={styles.formGroup}>
              <label htmlFor="provider">AI Provider</label>
              <select
                id="provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className={styles.select}
              >
                {availableProviders.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <small className={styles.providerDescription}>
                {availableProviders.find(p => p.id === selectedProvider)?.description}
              </small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="apiKey">API Key</label>
              <input
                type="password"
                id="apiKey"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className={styles.input}
                disabled={isSaving}
              />
              <small className={styles.inputHelp}>
                Your API key will be encrypted and stored securely. It will never be shared or exposed.
              </small>
            </div>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={isSaving || !newApiKey.trim()}
            >
              {isSaving ? 'Saving...' : 'Save API Key'}
            </button>
          </form>
        </div>

        {/* Instructions */}
        <div className={styles.instructions}>
          <h3>How to Get API Keys</h3>
          <div className={styles.providerInstructions}>
            <div className={styles.instructionItem}>
              <h4>🤖 Anthropic Claude</h4>
              <ol>
                <li>Visit <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></li>
                <li>Sign up or log in to your account</li>
                <li>Navigate to "API Keys" in the dashboard</li>
                <li>Click "Create Key" and copy the generated key</li>
                <li>Paste it in the form above</li>
              </ol>
              <p><strong>Note:</strong> Claude API keys start with "sk-ant-"</p>
            </div>

            <div className={styles.instructionItem}>
              <h4>🚀 OpenAI GPT (Coming Soon)</h4>
              <p>OpenAI integration will be available in a future update.</p>
            </div>

            <div className={styles.instructionItem}>
              <h4>🔍 Google Gemini (Coming Soon)</h4>
              <p>Google Gemini integration will be available in a future update.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
