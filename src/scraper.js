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
    getPolls: ({ offset }) =>
      `https://www.bundestag.de/ajax/filterlist/de/parlament/plenum/abstimmung/-/484422/?noFilterSet=true&offset=${offset}`,
    start: null,
  };

  browser = null;
  scrapedWeeks = [];
  eventEmitter = new events.EventEmitter();

  lastTitle = '';
  pollIds = [];

  async scrape(options) {
    this.options = { ...this.options, ...options };

    this.urls.start = this.urls.get({ id: this.options.startId });

    this.browser = await this.createNewBrowser();

    await this.getAvailablePolls();

    await this.getPolls({ id: parseInt(this.options.startId, 10) });
  }

  getAvailablePolls = async () => {
    const {
      browser: { browser },
    } = this;
    let offset = 0;
    let results = true;
    while (results) {
      const { body } = await browser.request({
        uri: this.urls.getPolls({ offset }),
      });
      const polls = body.match(/<a href="\/parlament\/plenum\/abstimmung\/abstimmung\?id=(\d*)"/g);
      if (polls) {
        this.pollIds = [
          ...this.pollIds,
          ...polls.map(poll => parseInt(poll.match(/(\d+)/)[1], 10)),
        ];

        offset += polls.length;
      } else {
        results = false;
      }
    }
    this.pollIds = [...new Set(this.pollIds)].filter(pollId => pollId >= parseInt(this.options.startId, 10));
  };

  getClosestPollId = (id) => {
    if (Math.max(this.pollIds < id)) {
      return false;
    }
    const closest = this.pollIds.reduce((prev, pollId) => {
      const diff = pollId - id;
      if (diff >= 0 && (prev === false || pollId <= prev)) {
        return pollId;
      }
      return prev;
    }, false);

    const index = this.pollIds.indexOf(closest);
    if (index > -1) {
      this.pollIds.splice(index, 1);
    }
    return closest;
  };

  getPolls = async ({ id }) => {
    let curId = this.getClosestPollId(id);
    if (!curId) {
      throw new Error('Poll id is to high!');
    }
    const {
      browser: { browser },
    } = this;
    let { body } = await browser.request({
      uri: this.urls.get({ id: curId }),
    });
    let { title, date, documents } = browser.getHead(body);
    let errorCount = 0;

    while (curId && errorCount < 5) {
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

      curId = this.getClosestPollId(curId);
    }
    if (errorCount >= 5) {
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
