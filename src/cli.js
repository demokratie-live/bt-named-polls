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

scraper.addListener('data', data => console.log('new data', util.inspect(data, false, null)));
scraper.addListener('finish', data => console.log('FINISH', util.inspect(data, false, null)));
scraper.addListener('error', data => console.log('ERROR', util.inspect(data, false, null)));

scraper
  .scrape({
    startId: program.start,
  })
  .catch((error) => {
    console.error(error);
  });
