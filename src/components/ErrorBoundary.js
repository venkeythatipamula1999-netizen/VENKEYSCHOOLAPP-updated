import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { C } from '../theme/colors';
import { reportError } from '../services/errorReporter';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = errorInfo?.componentStack || error?.stack || '';
    
    this.setState({
      errorMessage,
      errorStack
    });

    reportError({
      type: 'js_crash',
      severity: 'critical',
      message: `React Crash: ${errorMessage}`,
      screen: Platform.OS === 'web' ? window.location.pathname : 'react-native',
      details: errorStack,
      source: 'error_boundary'
    }).catch(err => {
      console.error('[ErrorBoundary] Failed to report error:', err);
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '', errorStack: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{
          flex: 1,
          backgroundColor: C.navy,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <ScrollView contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', minHeight: '100%' }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: C.coral,
              marginBottom: 16,
              textAlign: 'center'
            }}>
              Oops! Something Went Wrong
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: '#ccc',
              marginBottom: 24,
              textAlign: 'center'
            }}>
              Our admin team has been notified and will investigate this issue immediately.
            </Text>

            <View style={{
              backgroundColor: C.navyMid,
              borderLeftWidth: 4,
              borderLeftColor: C.coral,
              padding: 12,
              marginBottom: 24,
              borderRadius: 4,
              maxWidth: 400
            }}>
              <Text style={{
                fontSize: 12,
                color: '#999',
                fontFamily: 'monospace',
                marginBottom: 8
              }}>
                Error Details:
              </Text>
              <Text style={{
                fontSize: 12,
                color: '#ccc',
                fontFamily: 'monospace'
              }}>
                {this.state.errorMessage}
              </Text>
            </View>

            <TouchableOpacity
              onPress={this.handleReset}
              style={{
                backgroundColor: C.teal,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                marginBottom: 12
              }}
            >
              <Text style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Try Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.location.href = '/';
                } else {
                  this.handleReset();
                }
              }}
              style={{
                backgroundColor: C.navyLt,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: C.teal
              }}
            >
              <Text style={{
                color: C.teal,
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Go Home
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}
