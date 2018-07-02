#!/usr/bin/env node
/* eslint-disable no-mixed-operators */

const Scraper = require('./scraper');
const program = require('commander');
const util = require('util');

program
  .version('0.1.0')
  .description('Bundestag scraper')
  .option('--start [Start]', 'Start id', 1)
  .parse(process.argv);

const scraper = new Scraper();

process.on('SIGINT', async () => {
  process.exit(1);
});

scraper
  .scrape({
    startId: program.start,
    onData: data => console.log('new data', util.inspect(data, false, null)),
    onFinish: data => console.log('FINISH', util.inspect(data, false, null)),
  })
  .catch((error) => {
    console.error(error);
  });
