import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#fff' }}>
          <h1 style={{ color: '#ff4d4f' }}>页面渲染出错</h1>
          <p>错误信息: {this.state.error?.message}</p>
          <p>堆栈: {this.state.error?.stack}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '8px 16px', marginTop: '16px' }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
