import type { DeployConfig } from './config.js';

export type NotifyEvent = 'start' | 'success' | 'failure' | 'rollback';

export interface NotifyPayload {
    event: NotifyEvent;
    environment: 'staging' | 'production';
    appName: string;
    version: string;
    imageTag: string;
    duration?: number;
    error?: string;
    servers?: string[];
}

export async function sendNotification(
    config: DeployConfig,
    payload: NotifyPayload
): Promise<void> {
    const slack = config.notifications?.slack;
    if (!slack) return;

    // Check if this event should fire a notification
    if (!slack.onEvents.includes(payload.event)) return;

    // Resolve channel
    const channel =
        (slack.channels as Record<string, string> | undefined)?.[payload.environment] ??
        slack.channel;

    const message = buildSlackMessage(payload, channel);

    try {
        await fetch(slack.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        });
    } catch {
        // Notifications are best-effort — never crash the deploy
    }
}

function buildSlackMessage(
    payload: NotifyPayload,
    channel?: string
): Record<string, unknown> {
    const icons: Record<NotifyEvent, string> = {
        start: '🚀',
        success: '✅',
        failure: '❌',
        rollback: '🔄',
    };

    const colors: Record<NotifyEvent, string> = {
        start: '#7c8cf8',
        success: '#56d364',
        failure: '#f85149',
        rollback: '#f0b429',
    };

    const titles: Record<NotifyEvent, string> = {
        start: 'Deploy started',
        success: 'Deploy succeeded',
        failure: 'Deploy failed',
        rollback: 'Rollback executed',
    };

    const fields = [
        { title: 'App', value: payload.appName, short: true },
        { title: 'Environment', value: payload.environment, short: true },
        { title: 'Version', value: payload.version, short: true },
        ...(payload.duration
            ? [{ title: 'Duration', value: `${(payload.duration / 1000).toFixed(1)}s`, short: true }]
            : []),
        ...(payload.servers?.length
            ? [{ title: 'Servers', value: payload.servers.join(', '), short: false }]
            : []),
        ...(payload.error
            ? [{ title: 'Error', value: payload.error, short: false }]
            : []),
    ];

    return {
        ...(channel ? { channel } : {}),
        attachments: [
            {
                color: colors[payload.event],
                title: `${icons[payload.event]} ${titles[payload.event]}`,
                fields,
                footer: `Kode Deploy · ${new Date().toUTCString()}`,
            },
        ],
    };
}