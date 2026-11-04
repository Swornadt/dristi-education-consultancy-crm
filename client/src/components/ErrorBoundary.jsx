import { Component } from 'react';
import { Button, Result, Space } from 'antd';

// A page's code failed to download: usually a flaky connection, or the app was redeployed
// while this tab was open and the old file names no longer exist.
const isChunkError = (error) =>
  error?.name === 'ChunkLoadError' ||
  /dynamically imported module|Importing a module script failed|Loading chunk/i.test(error?.message ?? '');

// Catches errors thrown while rendering so one broken screen does not blank the whole app.
// Use `resetKey` (e.g. the current pathname) so navigating elsewhere clears the error.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Hook for a real error tracker later (Sentry etc.).
    console.error('Render error:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { fullPage } = this.props;
    const chunkError = isChunkError(this.state.error);
    return (
      <div style={fullPage ? { minHeight: '100vh', display: 'grid', placeItems: 'center' } : undefined}>
        <Result
          status={chunkError ? 'warning' : 'error'}
          title={chunkError ? "This page couldn't be loaded" : 'Something went wrong on this page'}
          subTitle={
            chunkError
              ? 'Check your connection and reload. If the app was just updated, reloading picks up the new version.'
              : 'This is a bug on our side, not something you did. Reloading usually fixes it.'
          }
          extra={
            <Space>
              <Button type="primary" onClick={() => window.location.reload()}>
                Reload page
              </Button>
              {!fullPage && <Button onClick={() => this.setState({ error: null })}>Try again</Button>}
            </Space>
          }
        />
      </div>
    );
  }
}
