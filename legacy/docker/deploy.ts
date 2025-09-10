#!/usr/bin/env ./node_modules/.bin/ts-node-script
import { ChildProcess, ExecException } from 'child_process';
const { exec } = require('child_process');

const execHandler = (err: ExecException | null, stdout: string, stderr: string) => {
  if (err) {
    console.error(`Error: ${err}`);
    return;
  }

  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }

  console.log(stdout);
}

const deploy = () => {
  let result: ChildProcess;

  result = exec('docker compose down', execHandler);

  if (result.exitCode != null && result.exitCode < 1) {
    result = exec('ddocker build -t cmp-app .', execHandler);
  }

  if (result.exitCode != null && result.exitCode < 1) {
    exec('docker compose -f docker-compose.deploy.yml up -d', execHandler);
  }
}

deploy();
