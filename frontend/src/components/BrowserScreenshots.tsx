/**
 * Browser Screenshots - Display agent browser activity with screenshots
 */
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { RealtimeEvent } from '@/hooks/useWebSocket';
import { Monitor, Download, X, ExternalLink, Maximize2, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Screenshot {
  screenshotId: string;
  filename: string;
  timestamp: number;
  url: string;
  title?: string;
  base64?: string;
  sessionId?: string;
  agentId?: string;
  fullPage?: boolean;
}

interface BrowserScreenshotsProps {
  agentId?: string;
  realtimeEvents: RealtimeEvent[];
}

export function BrowserScreenshots({ agentId, realtimeEvents }: BrowserScreenshotsProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchScreenshots();
  }, [agentId]);

  // Listen for new screenshots via WebSocket
  useEffect(() => {
    const screenshotEvents = realtimeEvents.filter(
      (event) => event.type === 'screenshot:captured'
    );

    if (screenshotEvents.length > 0) {
      const latestEvent = screenshotEvents[0];
      const newScreenshot: Screenshot = {
        screenshotId: latestEvent.data.screenshotId,
        filename: latestEvent.data.filename,
        timestamp: latestEvent.data.timestamp,
        url: latestEvent.data.url,
        title: latestEvent.data.title,
        base64: latestEvent.data.base64,
        sessionId: latestEvent.data.sessionId,
        agentId: latestEvent.data.agentId,
        fullPage: latestEvent.data.fullPage,
      };

      // Only add if it matches the agentId filter or no filter is set
      if (!agentId || newScreenshot.agentId === agentId) {
        setScreenshots((prev) => {
          // Check if screenshot already exists
          const exists = prev.some((s) => s.screenshotId === newScreenshot.screenshotId);
          if (exists) return prev;

          return [newScreenshot, ...prev];
        });
      }
    }
  }, [realtimeEvents, agentId]);

  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      const response = await axios.get(getApiUrl('/api/screenshots'));
      setScreenshots(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteScreenshot = async (screenshotId: string) => {
    try {
      await axios.delete(getApiUrl(`/api/screenshots/${screenshotId}`));
      setScreenshots((prev) => prev.filter((s) => s.screenshotId !== screenshotId));
      if (selectedScreenshot?.screenshotId === screenshotId) {
        setShowModal(false);
        setSelectedScreenshot(null);
      }
    } catch (error) {
      console.error('Failed to delete screenshot:', error);
    }
  };

  const getImageSrc = (screenshot: Screenshot): string => {
    if (screenshot.base64) {
      return `data:image/png;base64,${screenshot.base64}`;
    }
    return getApiUrl(`/api/screenshots/${screenshot.screenshotId}`);
  };

  const downloadScreenshot = (screenshot: Screenshot) => {
    const link = document.createElement('a');
    link.href = getImageSrc(screenshot);
    link.download = screenshot.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openModal = (screenshot: Screenshot) => {
    setSelectedScreenshot(screenshot);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedScreenshot(null), 300); // Delay to allow animation
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Browser Screenshots</h2>
              <p className="text-gray-600 mt-1">
                View agent browser activity and captured screenshots
              </p>
            </div>
          </div>

          <button
            onClick={fetchScreenshots}
            className="px-4 py-2 bg-white rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium shadow-sm border border-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Screenshots Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading screenshots...</p>
        </div>
      ) : screenshots.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <Monitor size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            No screenshots yet. Start an agent with browser access to capture screenshots!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.screenshotId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => openModal(screenshot)}
            >
              {/* Screenshot Image */}
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                <img
                  src={getImageSrc(screenshot)}
                  alt={screenshot.title || 'Screenshot'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                  <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                </div>

                {screenshot.fullPage && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                    Full Page
                  </div>
                )}
              </div>

              {/* Screenshot Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
                    {screenshot.title || 'Untitled Page'}
                  </h3>
                </div>

                {screenshot.url && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <ExternalLink size={12} />
                    <span className="truncate">{screenshot.url}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={12} />
                  <span>
                    {formatDistanceToNow(new Date(screenshot.timestamp), { addSuffix: true })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadScreenshot(screenshot);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteScreenshot(screenshot.screenshotId);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                  >
                    <X size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-2xl max-w-6xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedScreenshot.title || 'Screenshot'}
                </h3>
                {selectedScreenshot.url && (
                  <p className="text-sm text-gray-500 truncate max-w-2xl">
                    {selectedScreenshot.url}
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Image */}
            <div className="p-4">
              <img
                src={getImageSrc(selectedScreenshot)}
                alt={selectedScreenshot.title || 'Screenshot'}
                className="w-full h-auto rounded-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2 rounded-b-2xl">
              <button
                onClick={() => downloadScreenshot(selectedScreenshot)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                <Download size={18} />
                Download
              </button>
              <button
                onClick={() => deleteScreenshot(selectedScreenshot.screenshotId)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
