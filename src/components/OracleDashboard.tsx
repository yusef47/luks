import React, { useState, useEffect } from 'react';

interface TweetData {
    tweet: string;
    events: Array<{
        type: string;
        title: string;
        value?: number;
    }>;
    timestamp: string;
}

interface OracleDashboardProps {
    onClose: () => void;
}

export function OracleDashboard({ onClose }: OracleDashboardProps) {
    const [tweets, setTweets] = useState<TweetData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<any>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/oracle?action=history');
            const data = await response.json();
            if (data.success) {
                setTweets(data.tweets || []);
            } else {
                setError('Failed to fetch history');
            }
        } catch (e) {
            setError('Connection error');
        }
        setLoading(false);
    };

    const testOracle = async () => {
        setTestResult({ loading: true });
        try {
            const response = await fetch('/api/oracle?action=cycle');
            const data = await response.json();
            setTestResult(data);
            // Refresh history
            fetchHistory();
        } catch (e) {
            setTestResult({ error: 'Connection error' });
        }
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'NEWS': return '📰';
            case 'CRYPTO': return '₿';
            case 'EARTHQUAKE': return '🌍';
            default: return '📌';
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="oracle-dashboard">
            <div className="oracle-dashboard-header">
                <h2>🔮 Lukas Oracle Dashboard</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="oracle-dashboard-content">
                {/* Stats Section */}
                <div className="oracle-stats">
                    <div className="stat-card">
                        <span className="stat-value">{tweets.length}</span>
                        <span className="stat-label">Tweets Generated</span>
                    </div>
                    <button className="test-btn" onClick={testOracle}>
                        🚀 Test Oracle Now
                    </button>
                </div>

                {/* Test Result */}
                {testResult && (
                    <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                        {testResult.loading ? (
                            <span>⏳ Running Oracle cycle...</span>
                        ) : testResult.error ? (
                            <span>❌ {testResult.error}</span>
                        ) : testResult.action === 'SLEEP' ? (
                            <span>💤 No new events to report</span>
                        ) : (
                            <div>
                                <strong>✅ Tweet Generated:</strong>
                                <pre>{testResult.tweet}</pre>
                            </div>
                        )}
                    </div>
                )}

                {/* Tweet History */}
                <div className="oracle-history">
                    <h3>📜 Tweet History</h3>

                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : error ? (
                        <div className="error">{error}</div>
                    ) : tweets.length === 0 ? (
                        <div className="empty">
                            <p>No tweets yet. Click "Test Oracle Now" to generate one!</p>
                            <p className="hint">
                                Make sure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
                                are configured in Vercel environment variables.
                            </p>
                        </div>
                    ) : (
                        <div className="tweets-list">
                            {tweets.map((item, index) => (
                                <div key={index} className="tweet-card">
                                    <div className="tweet-time">{formatTime(item.timestamp)}</div>
                                    <div className="tweet-content">{item.tweet}</div>
                                    <div className="tweet-events">
                                        {item.events?.map((event, i) => (
                                            <span key={i} className="event-tag">
                                                {getEventIcon(event.type)} {event.title}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .oracle-dashboard {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 24px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          color: #fff;
        }

        .oracle-dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 16px;
        }

        .oracle-dashboard-header h2 {
          margin: 0;
          font-size: 1.5rem;
          background: linear-gradient(90deg, #a855f7, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .close-btn {
          background: none;
          border: none;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.2s;
        }
        .close-btn:hover { opacity: 1; }

        .oracle-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #a855f7;
        }

        .stat-label {
          font-size: 0.8rem;
          opacity: 0.7;
        }

        .test-btn {
          flex: 1;
          background: linear-gradient(135deg, #a855f7, #6366f1);
          border: none;
          border-radius: 12px;
          padding: 16px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .test-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(168, 85, 247, 0.3);
        }

        .test-result {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .test-result.success { border-left: 3px solid #22c55e; }
        .test-result.error { border-left: 3px solid #ef4444; }
        .test-result pre {
          background: rgba(0,0,0,0.3);
          padding: 12px;
          border-radius: 8px;
          white-space: pre-wrap;
          font-size: 0.9rem;
          margin-top: 8px;
        }

        .oracle-history h3 {
          margin: 0 0 16px 0;
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .loading, .error, .empty {
          text-align: center;
          padding: 32px;
          opacity: 0.7;
        }
        .empty .hint {
          font-size: 0.8rem;
          margin-top: 16px;
          opacity: 0.5;
        }

        .tweets-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tweet-card {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 16px;
          border-left: 3px solid #a855f7;
        }

        .tweet-time {
          font-size: 0.75rem;
          opacity: 0.5;
          margin-bottom: 8px;
        }

        .tweet-content {
          white-space: pre-wrap;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .tweet-events {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .event-tag {
          background: rgba(168, 85, 247, 0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
        }
      `}</style>
        </div>
    );
}
