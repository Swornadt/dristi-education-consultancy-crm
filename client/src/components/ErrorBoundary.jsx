import { Component } from 'react';
import { Button, Result, Space } from 'antd';

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
    return (
      <div style={fullPage ? { minHeight: '100vh', display: 'grid', placeItems: 'center' } : undefined}>
        <Result
          status="error"
          title="Something went wrong on this page"
          subTitle="This is a bug on our side, not something you did. Reloading usually fixes it."
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
