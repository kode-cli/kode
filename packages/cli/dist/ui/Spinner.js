import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
export function Spinner({ label, done = false, failed = false }) {
    const [frame, setFrame] = useState(0);
    useEffect(() => {
        if (done || failed)
            return;
        const timer = setInterval(() => {
            setFrame((f) => (f + 1) % FRAMES.length);
        }, 80);
        return () => clearInterval(timer);
    }, [done, failed]);
    const icon = done ? '✅' : failed ? '❌' : FRAMES[frame];
    const color = done ? 'green' : failed ? 'red' : 'cyan';
    return (React.createElement(Box, null,
        React.createElement(Text, { color: color },
            icon,
            " "),
        React.createElement(Text, null, label)));
}
//# sourceMappingURL=Spinner.js.map