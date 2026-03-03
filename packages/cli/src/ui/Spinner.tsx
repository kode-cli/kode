import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';

interface SpinnerProps {
    label: string;
    done?: boolean;
    failed?: boolean;
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function Spinner({ label, done = false, failed = false }: SpinnerProps): React.ReactElement {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        if (done || failed) return;
        const timer = setInterval(() => {
            setFrame((f) => (f + 1) % FRAMES.length);
        }, 80);
        return () => clearInterval(timer);
    }, [done, failed]);

    const icon = done ? '✅' : failed ? '❌' : FRAMES[frame];
    const color = done ? 'green' : failed ? 'red' : 'cyan';

    return (
        <Box>
            <Text color={color}>{icon} </Text>
            <Text>{label}</Text>
        </Box>
    );
}