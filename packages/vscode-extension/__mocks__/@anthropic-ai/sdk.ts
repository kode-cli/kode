import { vi } from 'vitest';

const mockClient = {
    messages: {
        create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: '[]' }],
        }),
        stream: vi.fn().mockReturnValue({
            [Symbol.asyncIterator]: async function* () {},
        }),
    },
};

const Anthropic = vi.fn(() => mockClient);

export default Anthropic;

