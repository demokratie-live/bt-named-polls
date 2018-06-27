/* eslint-disable max-len */
/* eslint-disable no-throw-literal */
import events from 'events';

import Browser from './Browser';

process.setMaxListeners(Infinity);

class Scraper {
  options = {
    startId: 1,
  };

  urls = {
    get: ({ id }) => `https://www.bundestag.de/parlament/plenum/abstimmung/abstimmung?id=${id}`,
    start: null,
  };

  browser = null;
  scrapedWeeks = [];
  eventEmitter = new events.EventEmitter();

  lastTitle = '';

  async scrape(options) {
    this.options = { ...this.options, ...options };

    this.urls.start = this.urls.get({ id: this.options.startId });

    this.browser = await this.createNewBrowser();

    await this.getPolls({ id: parseInt(this.options.startId, 10) });
  }

  getPolls = async ({ id }) => {
    let curId = id;
    const {
      browser: { browser },
    } = this;
    let { body } = await browser.request({
      uri: this.urls.get({ id: curId }),
    });
    let { title, date, documents } = browser.getHead(body);
    let errorCount = 0;

    while (errorCount < 50) {
      this.lastTitle = title;
      ({ body } = await browser.request({
        uri: this.urls.get({ id: curId }),
      }));
      try {
        ({ title, date, documents } = browser.getHead(body));
        const voteResults = browser.getPartyVotes(body);

        const resultData = {
          id: curId,
          title,
          date,
          documents,
          voteResults,
        };
        this.eventEmitter.emit('data', resultData);
        errorCount = 0;
      } catch (error) {
        this.eventEmitter.emit('error', { error, id: curId });
        errorCount += 1;
      }

      curId += 1;
    }
    if (errorCount >= 50) {
      this.eventEmitter.emit('finish', { success: false });
    } else {
      this.eventEmitter.emit('finish', { success: true });
    }
  };

  createNewBrowser = async ({ browserObject } = {}) => {
    if (browserObject) {
      delete browserObject.browser; // eslint-disable-line
    }
    const browser = new Browser();
    await browser.initialize(this.urls.start);
    return {
      browser,
      used: false,
      scraped: 0,
      errors: 0,
    };
  };

  addListener = (type, callback) => {
    this.eventEmitter.on(type, callback);
  };
}

module.exports = Scraper;
