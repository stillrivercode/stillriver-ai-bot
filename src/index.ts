#!/usr/bin/env node

import * as core from '@actions/core';
import { run } from './main';

// Execute the main function
run().catch(error => {
  core.error('Action failed:', error);
  process.exit(1);
});
