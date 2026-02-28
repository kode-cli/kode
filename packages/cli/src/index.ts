import { Command } from '@oclif/core';

export default class Hello extends Command {
    static description = 'Kode — Developer Productivity Suite';

    static examples = [
        '$ kode init my-project --template node-express',
        '$ kode commit',
        '$ kode check',
    ];

    async run(): Promise<void> {
        this.log('👋 Kode is installed and working!');
        this.log('Run kode --help to see all available commands.');
    }
}