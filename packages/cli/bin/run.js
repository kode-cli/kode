#!/usr/bin/env node

import 'dotenv/config';
import { run, flush, Errors } from '@oclif/core';

await run(process.argv.slice(2), import.meta.url);
await flush();