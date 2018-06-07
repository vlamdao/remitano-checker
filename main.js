const request = require('request');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

var moment = require('moment-timezone');

require('dotenv').config();

const telegram_token = process.env.telegram_token;
// const telegram_chat_id = process.env.telegram_chat_id;
const MONGODB_URI = process.env.MONGODB_URI;
const TIMEZONE = process.env.TIMEZONE;

moment().tz(TIMEZONE).format();

let page = 1;
let offer_type = 'sell';

var mongoose = require('mongoose');

mongoose.connect(MONGODB_URI);

var Schema = mongoose.Schema;

var OfferSchema = new Schema({ data: String });

var RemiSchema = new Schema({
  timestamp: Date,
  offers: [OfferSchema],
  offer_type: String,
  coin: String
});

var Remi = mongoose.model('Remi', RemiSchema);

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

// const bot = new TelegramBot(telegram_token, {
//   polling: true
// });

function generate_endpoint(coin, offer_type = 'sell', page = 1) {
  let endpoint;
  switch (coin) {
    case 'btc':
      endpoint = `https://remitano.com/api/v1/offers?offer_type=${offer_type}&country_code=vn&coin=${coin}&offline=false&page=${page}&coin_currency=${coin}`;
      break;
    case 'usdt':
    case 'eth':
    case 'bch':
      endpoint = `https://${coin}.remitano.com/api/v1/offers?offer_type=${offer_type}&country_code=vn&coin=${coin}&offline=false&page=${page}&coin_currency=${coin}`;
      break;
  }
  return endpoint;
}

function start() {
  ['btc', 'usdt', 'eth', 'bch'].forEach(function (coin) {

    var timestamp = moment(new Date()).format();

    ['sell', 'buy'].forEach(function (offer_type) {
      let endpoint = generate_endpoint(coin, offer_type);
      const remitano = request(endpoint, function (err, res, body) {
        if (!err) {
          body = JSON.parse(body);
          
          let arr_offers = body['offers'];
          
          let remi = new Remi();

          remi.coin = coin;
          remi.offer_type = offer_type;
          remi.timestamp = timestamp;

          arr_offers.forEach(function(offer) {
            remi.offers.push({data: JSON.stringify(offer)});
          })

          remi.save();
        }
      });
    })
  });
}

start();