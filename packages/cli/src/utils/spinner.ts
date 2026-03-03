import { render } from 'ink';
import React from 'react';
import { Spinner } from '../ui/Spinner.js';

/**
 * Runs an async function while showing a spinner with a label.
 * Shows a success state on completion or a failure state on error.
 */
export async function runWithSpinner(label: string, fn: () => Promise<void>): Promise<void> {
    const { unmount, rerender } = render(
        React.createElement(Spinner, { label })
    );
    try {
        await fn();
        rerender(React.createElement(Spinner, { label, done: true }));
    } catch (err) {
        rerender(React.createElement(Spinner, { label, failed: true }));
        unmount();
        throw err;
    }
    await new Promise((r) => setTimeout(r, 150));
    unmount();
}

