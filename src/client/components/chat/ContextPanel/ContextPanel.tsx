import React, { useState, useEffect } from 'react';
import { ChatSession } from '../../../../services/chat/chat.service';
import { ConversationContext } from '../../../../core/models/ConversationContext';
import { UserContextProfile } from '../../../../core/models/UserContextProfile';
import styles from './ContextPanel.module.css';

interface ContextPanelProps {
  session: ChatSession | null;
  onClose: () => void;
}

interface ContextData {
  conversationContext?: ConversationContext;
  userProfile?: UserContextProfile;
  sessionMetadata?: Record<string, any>;
  activeModules?: string[];
  environmentInfo?: Record<string, any>;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ session, onClose }) => {
  const [contextData, setContextData] = useState<ContextData>({});
  const [activeTab, setActiveTab] = useState<'session' | 'user' | 'modules' | 'environment'>(
    'session'
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContextData();
  }, [session]);

  const loadContextData = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      // TODO: Load actual context data from services
      // For now, using mock data
      const mockContextData: ContextData = {
        conversationContext: {
          systemPrompt:
            'You are a helpful AI assistant focused on providing accurate and useful information.',
          personaAttributes: {
            helpfulness: 0.9,
            creativity: 0.7,
            formality: 0.6,
          },
          memoryElements: [
            {
              id: 'mem-1',
              type: 'preference',
              content: 'User prefers concise explanations',
              relevanceScore: 0.8,
              timestamp: new Date(Date.now() - 86400000),
              source: 'conversation_analysis',
            },
            {
              id: 'mem-2',
              type: 'context',
              content: 'Currently working on a software project',
              relevanceScore: 0.9,
              timestamp: new Date(Date.now() - 3600000),
              source: 'user_input',
            },
          ],
          activeTools: ['web_search', 'code_analysis', 'file_reader'],
          userProfile: {
            preferences: {
              theme: 'auto',
              language: 'en',
              timezone: 'UTC-8',
              fontSize: 'medium',
              highContrast: false,
              screenReader: false,
              formality: 'casual',
              verbosity: 'moderate',
              technicalLevel: 'advanced',
            },
            history: [],
            knownFacts: {
              occupation: 'Software Developer',
              experience: 'Advanced',
            },
          },
          environmentContext: {
            timezone: 'UTC-8',
            locale: 'en-US',
            device: {
              type: 'desktop',
              capabilities: ['text', 'image', 'audio'],
            },
            currentTime: new Date(),
          },
          customData: {},
        },
        sessionMetadata: session.metadata || {},
        activeModules: ['text_processor', 'image_analyzer', 'code_interpreter'],
        environmentInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      setContextData(mockContextData);
    } catch (error) {
      console.error('Failed to load context data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const renderSessionTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.section}>
        <h4>Session Information</h4>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Title:</label>
            <span>{session?.title}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Created:</label>
            <span>{session ? formatDate(session.createdAt) : 'N/A'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Last Updated:</label>
            <span>{session ? formatDate(session.updatedAt) : 'N/A'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Profile ID:</label>
            <span>{session?.profileId || 'Default'}</span>
          </div>
        </div>
      </div>

      {contextData.conversationContext && (
        <div className={styles.section}>
          <h4>Conversation Context</h4>
          <div className={styles.systemPrompt}>
            <label>System Prompt:</label>
            <p>{contextData.conversationContext.systemPrompt}</p>
          </div>

          <div className={styles.personalityAttributes}>
            <label>Personality Attributes:</label>
            <div className={styles.attributeGrid}>
              {Object.entries(contextData.conversationContext.personaAttributes).map(
                ([key, value]) => (
                  <div key={key} className={styles.attribute}>
                    <span className={styles.attributeName}>{key}:</span>
                    <div className={styles.attributeBar}>
                      <div
                        className={styles.attributeFill}
                        style={{ width: `${(value as number) * 100}%` }}
                      />
                    </div>
                    <span className={styles.attributeValue}>
                      {((value as number) * 100).toFixed(0)}%
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className={styles.activeTools}>
            <label>Active Tools:</label>
            <div className={styles.toolList}>
              {contextData.conversationContext.activeTools.map(tool => (
                <span key={tool} className={styles.toolTag}>
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {contextData.conversationContext?.memoryElements && (
        <div className={styles.section}>
          <h4>Memory Elements</h4>
          <div className={styles.memoryList}>
            {contextData.conversationContext.memoryElements.map(memory => (
              <div key={memory.id} className={styles.memoryItem}>
                <div className={styles.memoryHeader}>
                  <span className={styles.memoryType}>{memory.type}</span>
                  <span className={styles.memoryRelevance}>
                    {(memory.relevanceScore! * 100).toFixed(0)}%
                  </span>
                </div>
                <p className={styles.memoryContent}>{memory.content}</p>
                <div className={styles.memoryMeta}>
                  <span>Source: {memory.source}</span>
                  <span>{formatDate(memory.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderUserTab = () => (
    <div className={styles.tabContent}>
      {contextData.conversationContext?.userProfile && (
        <>
          <div className={styles.section}>
            <h4>User Preferences</h4>
            <div className={styles.infoGrid}>
              {Object.entries(contextData.conversationContext.userProfile.preferences).map(
                ([key, value]) => (
                  <div key={key} className={styles.infoItem}>
                    <label>{key}:</label>
                    <span>{String(value)}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h4>Known Facts</h4>
            <div className={styles.infoGrid}>
              {Object.entries(contextData.conversationContext.userProfile.knownFacts).map(
                ([key, value]) => (
                  <div key={key} className={styles.infoItem}>
                    <label>{key}:</label>
                    <span>{String(value)}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h4>Interaction History</h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>Total Interactions:</label>
                <span>{contextData.conversationContext.userProfile.history.length}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderModulesTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.section}>
        <h4>Active Modules</h4>
        <div className={styles.moduleList}>
          {contextData.activeModules?.map(module => (
            <div key={module} className={styles.moduleItem}>
              <div className={styles.moduleIcon}>🔧</div>
              <div className={styles.moduleInfo}>
                <span className={styles.moduleName}>{module}</span>
                <span className={styles.moduleStatus}>Active</span>
              </div>
            </div>
          )) || <p>No modules loaded</p>}
        </div>
      </div>
    </div>
  );

  const renderEnvironmentTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.section}>
        <h4>Environment Information</h4>
        <div className={styles.infoGrid}>
          {contextData.environmentInfo &&
            Object.entries(contextData.environmentInfo).map(([key, value]) => (
              <div key={key} className={styles.infoItem}>
                <label>{key}:</label>
                <span className={styles.environmentValue}>{String(value)}</span>
              </div>
            ))}
        </div>
      </div>

      {contextData.conversationContext?.environmentContext && (
        <div className={styles.section}>
          <h4>Device Capabilities</h4>
          <div className={styles.capabilityList}>
            {contextData.conversationContext.environmentContext.device.capabilities.map(
              (capability: string) => (
                <span key={capability} className={styles.capabilityTag}>
                  {capability}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!session) {
    return (
      <div className={styles.contextPanel}>
        <div className={styles.header}>
          <h3>Context</h3>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>
        <div className={styles.emptyState}>
          <p>No session selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contextPanel}>
      <div className={styles.header}>
        <h3>Context</h3>
        <button onClick={onClose} className={styles.closeButton}>
          ×
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'session' ? styles.active : ''}`}
          onClick={() => setActiveTab('session')}
        >
          Session
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'user' ? styles.active : ''}`}
          onClick={() => setActiveTab('user')}
        >
          User
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'modules' ? styles.active : ''}`}
          onClick={() => setActiveTab('modules')}
        >
          Modules
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'environment' ? styles.active : ''}`}
          onClick={() => setActiveTab('environment')}
        >
          Environment
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading context...</div>
        ) : (
          <>
            {activeTab === 'session' && renderSessionTab()}
            {activeTab === 'user' && renderUserTab()}
            {activeTab === 'modules' && renderModulesTab()}
            {activeTab === 'environment' && renderEnvironmentTab()}
          </>
        )}
      </div>
    </div>
  );
};
