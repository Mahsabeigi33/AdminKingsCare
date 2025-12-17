/* eslint-disable @typescript-eslint/no-explicit-any */
// No-op Google font stubs for offline/airgapped builds
// Provides the same surface (className/variable) so layout code stays unchanged.
export function Geist(_opts?: any): { className: string; variable?: string } {
  void _opts
  return { className: '', variable: '' }
}

export function Geist_Mono(_opts?: any): { className: string; variable?: string } {
  void _opts
  return { className: '', variable: '' }
}

// Generic fallback for any other google fonts if imported elsewhere
export function createNoopFont() {
  return { className: '', variable: '' }
}
