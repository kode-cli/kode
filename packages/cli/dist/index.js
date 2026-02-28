"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
class Hello extends core_1.Command {
    async run() {
        this.log('👋 Kode is installed and working!');
        this.log('Run kode --help to see all available commands.');
    }
}
Hello.description = 'Kode — Developer Productivity Suite';
Hello.examples = [
    '$ kode init my-project --template node-express',
    '$ kode commit',
    '$ kode check',
];
exports.default = Hello;
//# sourceMappingURL=index.js.map