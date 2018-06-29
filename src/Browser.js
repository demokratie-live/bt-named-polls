const request = require('request');

// fix Date.parse
const MONTH = [
  { string: 'März', fix: 'March' },
  { string: 'Mai', fix: 'May' },
  { string: 'Oktober', fix: 'October' },
  { string: 'Dezember', fix: 'December' },
];

class Browser {
  cookie = null;

  constructor() {
    this.cookie = request.jar();
  }

  initialize = uri =>
    this.request({
      ...this.defReqOpt,
      uri,
    });

  request = (opts) => {
    const reqOptions = {
      timeout: 15000,
      method: 'GET',
      jar: this.cookie,
      ...opts,
    };

    return new Promise((resolve, reject) => {
      request(reqOptions, (error, res, body) => {
        if (!error && res.statusCode === 200) {
          resolve({ res, body });
        } else {
          reject(error);
        }
      });
    });
  };

  getHead = (body) => {
    const [, head] = body.match(/<article class="bt-artikel col-xs-12 bt-standard-content">(.*?)<\/article>/s);
    let [, date] = head.match(/<span class="bt-dachzeile">(.*?)<\/span>/s);
    const [, title] = head.match(/<br\/>(.*?)<\/h3>/s);
    const documentsData = head.match(/<i class="icon-doc"><\/i>(\d{1,3}\/\d{1,10})<\/a>/g);
    MONTH.forEach(({ string, fix }) => {
      date = date.replace(`${string}`, `${fix}`);
    });
    let documents = [];
    if (documentsData) {
      documents = documentsData.map(doc =>
        doc.replace('<i class="icon-doc"></i>', '').replace('</a>', ''));
    }
    return { date: new Date(Date.parse(date)), title, documents };
  };

  getPartyVotes = (body) => {
    const partyVotesHtml = body.match(/<div class="col-xs-12 col-sm-3">(.*?)<\/a>\s*<\/div>/gs);
    const partyVotes = partyVotesHtml.reduce((prev, html) => {
      const [, party] = html.match(/<h4 class="bt-chart-fraktion">(.*?)<br\/>/s);
      const voteResults = html
        .match(/<li class="bt-legend-(?:ja|nein|enthalten|na)">(.*?)<\/li>/gs)
        .map(voteResultHtml => voteResultHtml.match(/>(.*?)</)[1].split(' '))
        .reduce((prev, [votes, decision]) => ({ ...prev, [decision]: votes }), {});
      return { ...prev, [party]: voteResults };
    }, {});
    return partyVotes;
  };
}

export default Browser;
