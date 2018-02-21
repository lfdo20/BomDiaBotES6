'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

var _dropbox = require('dropbox');

var _dropbox2 = _interopRequireDefault(_dropbox);

var _twit = require('twit');

var _twit2 = _interopRequireDefault(_twit);

var _nodeTelegramBotApi = require('node-telegram-bot-api');

var _nodeTelegramBotApi2 = _interopRequireDefault(_nodeTelegramBotApi);

var _convertbtc = require('./convertbtc');

var _convertbtc2 = _interopRequireDefault(_convertbtc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// local enviroment variables
// dotenv.load();

// Telegram api config
var bot = new _nodeTelegramBotApi2.default(process.env.BOT_TOKEN, { polling: true });

// Global Var
var bddata = {},
    newBdia = void 0,
    newbdv = void 0,
    newptv = void 0,
    newBdiaCount = 0,
    newgifCount = 0,
    rgifcount = 0;

var dropfilesurl = [[process.env.DROP_DATA, 'data.json', 'bddata'], [process.env.DROP_GIF, 'gifdata.json', 'gifdata']];
var gifdata = {
  newgif: [],
  ckdgif: [],
  lastgif: []
};

// Time config
var nowDay = function nowDay() {
  return (0, _moment2.default)().format('ddd');
};
var STime = (0, _moment2.default)('14:00', 'HHmm'); // 14:00
var ETime = (0, _moment2.default)('23:59', 'HHmm'); // 23:59

// Dropbox Config
var dbx = new _dropbox2.default({
  key: process.env.DROPBOX_APP_KEY,
  secret: process.env.DROPBOX_APP_SECRET,
  accessToken: process.env.DROPBOX_TOKEN,
  sandbox: false
});

// Twitter Integration
var T = new _twit2.default({
  consumer_key: process.env.TWITTER_CONSUMER,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_TOKEN,
  access_token_secret: process.env.TWITTER_TOKEN_SECRET,
  timeout_ms: 60 * 1000
});

var streamTwit = T.stream('user');
streamTwit.on('tweet', tweetReply);

// Seção de Notas

// IDEA: organizar como o bot será utilizado em vários grupos:
// arquivos diferentes ? mesclar bases de dados ?

// IDEA: json não trabalha com " " dá problema, tem que
// converter regex pra detectar : (.+)(')(.+)(')(.+)?

console.log('bot server started...');

// pega o arquivo no dropbox e transforma em objeto
// bddata = JSON.parse(require('fs').readFileSync('data.json', 'utf8'));
function startRead() {
  dropfilesurl.forEach(function (id) {
    dbx.sharingGetSharedLinkFile({ url: id[0] }).then(function (data) {
      _fs2.default.writeFileSync(data.name, data.fileBinary, 'binary', function (err) {
        if (err) {
          throw err;
        } else {
          // console.log('File: ' + data.name + ' saved.');
        }
      });
      if (id[2] === 'bddata') {
        bddata = JSON.parse(_fs2.default.readFileSync('./data.json', 'utf8'));
      } else if (id[2] === 'gifdata') {
        gifdata = JSON.parse(_fs2.default.readFileSync('./gifdata.json', 'utf8'));
      }
    }).catch(function (err) {
      throw err;
    });
  });
}
startRead();

/*

const { latebdreceived, latebdsay, bomdia, bdiasvar, pontosvar } = bddata;

const { ckdgif, newgif, lastgif, tumblrgif, tumblrlist } = gifdata;

*/

bot.on('message', function (msg) {});

// comando para imagem do dia
bot.onText(/^\/bdcdia$|^\/bdcdia@bomdiacracobot$/, function (msg) {
  var text = 'https://www.dropbox.com/s/ty8b23y8qmcfa0y/bdcdia.jpg?raw=1';
  bot.sendPhoto(msg.chat.id, text).then(function () {
    // reply sent!
  });
});

// comando para ultimos recebidos
bot.onText(/^\/bdcultimos$|^\/bdcultimos@bomdiacracobot$/, function (msg) {
  var text = '' + bddata.latebdreceived.map(function (elem) {
    return '' + elem;
  }).join('\n');
  console.log(text);
  bot.sendMessage(msg.chat.id, text).then(function () {
    // reply sent!
  });
});

// comando para salvar arquivos
bot.onText(/^\/bdcsave\s(data|gif)$/, function (msg, match) {
  match[1] === 'data' ? saveNewdata(bddata) : saveNewdata(gifdata);
  bot.sendMessage(msg.chat.id, 'Salvo!');
});

// comando para help
bot.onText(/^\/bdchelp$|^\/bdchelp@bomdiacracobot$/, function (msg) {
  var text = 'Bom dia!\n    Eu guardo toda a frase dita ap\xF3s "bom dia".\n    E respondo todos os bom dias com ou sem frases..\n    mas ainda n\xE3o entendo coisas loucas tipo "bu\xF3nday".\n\n    /bdcstatus - Ver a quantidades de bom dias no banco\n    /bdcadmin - Ver comandos de administra\xE7\xE3o\n    /bdcbtc - Ver cota\xE7\xE3o bitcoin. Formato: 1 BTC BRL\n    /bdcultimos - Ver os ultimos bom dias adicionados';
  bot.sendMessage(msg.chat.id, text).then(function () {});
});

bot.onText(/^\/bdcadmin\s(.+)$/, function (msg, match) {
  if (match[1] === process.env.ADM_PASS) {
    var text = '\n    Comandos de manuten\xE7\xE3o:\n\n    /bdcgifdup - Checar duplicidade de gifs.\n    /bdccheck X - Checar e validar os gifs recebidos. (X = quantidade)\n    /bdcsave - Salvar os arquivos de dados. (data | gif)';
    bot.sendMessage(msg.chat.id, text).then(function () {});
  } else {
    var _text = 'Senha errada.';
    bot.sendMessage(msg.chat.id, _text).then(function () {});
  }
});

// buscar gif por id/tamanho duplicados e apresentar seus ids
var dupgifs = [];
var dgiftemp = void 0;
function itgifdup(msg) {
  if (dupgifs.length > 0) {
    dupgifs[0].forEach(function (gf) {
      console.log('oi4 : ', gf);
      dgiftemp = gf;
      bot.sendDocument(msg.chat.id, gf[0], {
        caption: gf[0].toString() + '  ' + gf[1].toString()
      });
    });
    bot.sendMessage(msg.chat.id, 'Aguardando...', {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        keyboard: [['proximo']],
        selective: true
      }
    });
    dupgifs.shift();
  } else {
    endkeyboard(msg);
  }
}

bot.onText(/^\/bdcgifdup$/gi, function (msg, match) {
  var _gifdata = gifdata,
      ckdgif = _gifdata.ckdgif,
      newgif = _gifdata.newgif,
      lastgif = _gifdata.lastgif,
      tumblrgif = _gifdata.tumblrgif,
      tumblrlist = _gifdata.tumblrlist;

  ckdgif.forEach(function (x) {
    var dupt = ckdgif.filter(function (y) {
      return y[0] === x[0] && y[1] === x[1];
    });
    if (dupt.length > 1) {
      dupgifs.push(dupt);
    }
  });
  console.log('Gifs Duplicados : ', dupgifs);
  itgifdup(msg);
});

// Recebimento de gifs putaria e contagem
bot.on('document', function (msg) {
  if (nowDay() === 'Fri') {
    // check is is Fri
    if (msg.document.mime_type === 'video/mp4') {
      // console.log(msg.document);
      // var gifthumb = 'https://api.telegram.org/file/bot'+token+'/'+msg.document.thumb.file_path;
      var newGf = [msg.document.file_id, msg.document.file_size.toString()];
      // console.log(gifthumb);
      checkBdData(gifdata.newgif, newGf, 'gif');
      rgifcount += 1;
      console.log('Gif aleat\xF3rio contador: ' + rgifcount);
      if (rgifcount > 3) {
        if ((0, _moment2.default)().isBetween(STime, ETime, 'minute', '[]')) {
          randomGif(msg);
          rgifcount = 0;
        }
      }
    }
  }
});

// NOTE: data não está detectando o dia após meia noite.

// função para lembrar que vai começar a putaria
var endputsaid = 0;
function putariaRemenber(msg, faltam) {
  // console.log(faltam);
  if (faltam <= 60 && endputsaid === 0) {
    bot.sendMessage(msg.chat.id, 'Faltam ' + faltam + ' minutos para acabar a putaria! \uD83D\uDE2D\uD83D\uDE2D').then(function () {
      endputsaid = 2;
    });
  } else if (faltam <= 20 && endputsaid === 2) {
    bot.sendMessage(msg.chat.id, 'Faltam ' + faltam + ' minutos para acabar a putaria! \uD83D\uDE31\uD83D\uDE31').then(function () {
      endputsaid = 4;
    });
  } else if ((faltam <= 1 || faltam > 60) && endputsaid !== 0) {
    endputsaid = 0;
  }
}

// comando para gifd tumblrs teste
bot.onText(/^(pootaria)$/gi, function (msg, match) {
  randomGif(msg);
});

// comando para gifs putaria
function getGif() {
  var _gifdata2 = gifdata,
      ckdgif = _gifdata2.ckdgif,
      newgif = _gifdata2.newgif,
      lastgif = _gifdata2.lastgif,
      tumblrgif = _gifdata2.tumblrgif,
      tumblrlist = _gifdata2.tumblrlist;

  var cb = void 0;
  var gifrand = function gifrand() {
    return Math.floor(Math.random() * ckdgif.length).toString();
  };
  ckdgif.find(function (x) {
    var gifNum = gifrand();
    if (lastgif.every(function (y) {
      return y !== gifNum;
    })) {
      lastgif.shift();
      lastgif.push(gifNum.toString());
      cb = ckdgif[gifNum][0];
      console.log(cb);
    }
    return cb;
  });
  return cb;
}

var gftagrxdays = /^(p(u|o)+taria+)$/gi;
var gftagrxfri = /^(.+)?(p(u|o)+taria+)(.+)?$/gi;
var gftagrx = function gftagrx() {
  return nowDay() === 'Tue' ? gftagrxfri : gftagrxdays;
};

bot.onText(gftagrx(), function (msg) {
  if (nowDay() !== 'Fri') {
    // Correto é Fri
    bot.sendMessage(msg.chat.id, 'Hoje não é dia né. Tá achando que putaria é bagunça!?').then(function () {});
  } else if (!(0, _moment2.default)().isBetween(STime, ETime, 'minute', '[]')) {
    var faltam = Math.abs((0, _moment2.default)().diff(STime, 'minute'));
    faltam = faltam > 60 ? Math.round(faltam / 60) + ' h e ' + faltam + ' % 60 min' : faltam + ' min';
    bot.sendMessage(msg.chat.id, 'Caaaaalma, faltam ' + faltam + ' para come\xE7ar a putaria!').then(function () {});
  } else {
    var gifId = getGif();
    // console.log('testeoi', gifId);
    if (gifId !== undefined) {
      bot.sendDocument(msg.chat.id, gifId).then(function () {
        newgifCount += 1;
        console.log('Contador novo gif: ' + newgifCount);
        rgifcount += 1;
        console.log('Contador gif random: ' + rgifcount);
        if (newgifCount >= 5) {
          saveNewdata(gifdata);
          newgifCount = 0;
        }
      });
    }
  }
});

// função para putarias random tumblr
var ix = 0,
    uri = void 0;
var rgifrx = /(h\S+\.gif(?!\'\)))/gi;

// (\<img src\=\")(h\S+gif(?!\"\/\<br))("\/\>)/gi;
function randomGif(msg) {
  var _gifdata3 = gifdata,
      ckdgif = _gifdata3.ckdgif,
      newgif = _gifdata3.newgif,
      lastgif = _gifdata3.lastgif,
      tumblrgif = _gifdata3.tumblrgif,
      tumblrlist = _gifdata3.tumblrlist;
  // console.log(gifdata.tumblrgif.length);

  if (tumblrgif.length > 0) {
    bot.sendDocument(msg.chat.id, tumblrgif[0]).then(function () {
      // console.log('foi');
      tumblrgif.shift();
      rgifcount = 0;
    });
  } else if (tumblrgif.length === 0) {
    (function getlink() {
      // ix = gifdata.tumblrgif[gifdata.tumblrgif.length];
      // if (ix < gifdata.tumblrlist.length) {
      uri = tumblrlist[ix][0].toString();
      // console.log('rgif : '+ix+' & '+uri);
      // getFeed(uri, ix).then((i) => {
      (function getFeed() {
        return new Promise(function (resolve, reject) {
          (0, _request2.default)(uri, function (err, res, body) {
            if (err) {
              console.log(err);
            }
            body.replace(rgifrx, function (match, p1, p2) {
              tumblrgif.push(match);
            });

            bot.sendDocument(msg.chat.id, tumblrgif[0]).then(function () {
              tumblrgif.shift();
              rgifcount = 0;
              ix += 1;
              tumblrlist.pop();
              tumblrlist.push(ix.toString());
              saveNewdata(gifdata);
            });
          });
        });
      })();
      // });
      // }
    })();
  }
}

// NOTE:  comando para salvar todos os thumbs de gifs
// var download = function(uri, filename, callback){
// request.head(uri, function(err, res, body){
//   console.log('content-type:', res.headers['content-type']);
//   console.log('content-length:', res.headers['content-length']);
//
//   request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
// });
// };
//
// download('https://www.google.com/images/srpr/logo3w.png', 'google.png', function(){
// console.log('done');
// });

// comandos para checar os gifs
var ckgfid = '',
    ckgfsize = '',
    ckgfthlink = '',
    checknum = 0;

var endkeyboard = function endkeyboard(msg) {
  saveNewdata(gifdata);
  bot.sendMessage(msg.chat.id, 'Nada mais para validar..', {
    reply_to_message_id: msg.message_id,
    reply_markup: {
      remove_keyboard: true,
      selective: true
    }
  });
};

var newgfcheck = function newgfcheck(msg) {
  if (gifdata.newgif.length > 0 && checknum > 0) {
    ckgfid = gifdata.newgif[0][0];
    var urigif = 'https://api.telegram.org/bot' + process.env.BOT_TOKEN + '/getFile?file_id=' + ckgfid;
    console.log(urigif);
    _request2.default.get(urigif, { json: true }, function (err, res, body) {
      console.log('Gif Check :', body.result);
      ckgfsize = body.result.file_size;
      ckgfthlink = '';
    });

    bot.sendDocument(msg.chat.id, ckgfid, {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        keyboard: [['👍 Sim', '👎 Não'], ['👈 Pular']],
        selective: true
      }
    }).then(function () {
      checknum -= 1;
    });
  } else {
    endkeyboard(msg);
    checknum = 0;
  }
};

bot.onText(/^\/bdccheck(\s)(\d+)$/, function (msg, match) {
  checknum = match[2];
  newgfcheck(msg);
});

// comando para analisar várias mensagens recebidas e distribuir as funções
var putexec = false,
    putstartcheck = false,
    vcmsg = '';

// mensagens de início / fim de hora da putaria
var timeouttemp = 5;
bot.on('message', function (msg) {
  if (nowDay() === 'Fri') {
    if (!putexec) {
      var timeS = _moment2.default.unix(msg.date).format('HH');
      if (timeS === '23') {
        var faltam = Math.abs((0, _moment2.default)().diff(ETime, 'minute'));
        putariaRemenber(msg, faltam);
      } else if (timeS === '13') {
        // 13
        var _faltam = (0, _moment2.default)().diff((0, _moment2.default)('14:00', 'HHmm'), 'minute') * -1;
        console.log('t3 ', _faltam); // STime
        if (_faltam < 30 && _faltam > 0 && !putstartcheck) {
          putstartcheck = true;
          vcmsg = msg.chat.id;
          console.log(msg, vcmsg, timeS, _faltam);
          setTimeout(function () {
            bot.sendAudio(vcmsg, 'CQADAQADCgAD9MvIRuM_NpJIg6-YAg'); // msg.chat.id
            setTimeout(function () {
              putstartcheck = false;
            }, 60000);
          }, _faltam * 60 * 1000);
        }
      }
      putexec = true;
      setTimeout(function () {
        putexec = false;
      }, 3000);
    }
    // putariaCalc(msg);
  }

  var _gifdata4 = gifdata,
      ckdgif = _gifdata4.ckdgif,
      newgif = _gifdata4.newgif;


  if (checknum > 0) {
    // console.log(msg);
    var cks = '👍 sim';
    if (msg.text.toString().toLowerCase().indexOf(cks) === 0) {
      console.log('ok sim');
      newgif.shift();
      var temp = [ckgfid, ckgfsize.toString()];
      ckdgif.push(temp);
      // console.log(gifdata.ckdgif);
      newgfcheck(msg);
    }

    var ckn = '👎 não';
    if (msg.text.toString().toLowerCase().indexOf(ckn) === 0) {
      console.log('ok não');
      newgif.shift();
      newgfcheck(msg);
    }

    var ckr = '👈 pular';
    if (msg.text.toString().toLowerCase().indexOf(ckr) === 0) {
      console.log('ok pula');
      newgif.shift();
      newgif.push(ckgfid);
      newgfcheck(msg);
    }
  }

  // nada mais para validar ....
  // console.log(msg);
  setTimeout(function () {
    if (timeouttemp > 0) {
      timeouttemp = 5;
    } else {
      timeouttemp = 0;
    }
  }, 3000);
  if (timeouttemp === 8) {
    bot.sendMessage(msg.chat.id, 'Nada mais para validar @' + msg.from.username + ' ...');
  }

  if (dgiftemp !== undefined) {
    var ckdl = 'proximo';
    if (msg.text.toString().toLowerCase().indexOf(ckdl) === 0) {
      console.log(dgiftemp);
      // newgif.splice(newgif.findIndex(dgiftemp), 0);
      itgifdup(msg);
    }
  }
});

// comando para Hoje é dia quê
var hjmessage = void 0;
var hjdiarx = /^(\w+(?=\s)\s)?((hoje|hj)|(que|q))?(.{3}|.)?((dia)|(hoje|hj)|(que|q))(.{4}|.{3})((dia)|(hoje|hj)|(que|q))$/gi;

bot.onText(hjdiarx, function (msg, match) {
  var tp1 = match[6]; // dia
  var tp2 = match[11]; // q que ou hoje
  if (tp1 === 'dia' && tp2.match(/^(q|que|hoje|hj)$/)) {
    switch (nowDay()) {
      case 'Sun':
        hjmessage = '\uD83C\uDF70\uD83C\uDF77 DOMINGO MI\xC7ANGUEIRO CREATIVO DA POHRA \uD83C\uDFA8\n        Pornfood e artes\n        (desenhos, textos, fotos de paisagens, pets, etc)\n        ';
        break;
      case 'Mon':
        hjmessage = '\uD83C\uDFA7 segunda feira spatifou \uD83C\uDFA4\n        M\xFAsicas, artistas, playlists e karaoke\n        ';
        break;
      case 'Tue':
        hjmessage = '\uD83D\uDCF7 ter\xE7a feira eg\xF3latra \uD83D\uDC86\n        Egoshot, hist\xF3rias pessoais e desabafos\n        ';
        break;
      case 'Wed':
        hjmessage = '\uD83D\uDE02 quarta feira gozada \uD83D\uDC4C\n        Piadas, twits, prints...\n        ';
        break;
      case 'Thu':
        hjmessage = '\uD83D\uDCE2 QUINTA FEIRA RADIO DE INTERNETE \uD83D\uDCFB\n        Epis\xF3dios de podcast pra indicar, lolicast e audioza\xE7os...\n        ';
        break;
      case 'Fri':
        hjmessage = '\uD83C\uDF46 sEXTA XERA SEN REGRAS \uD83D\uDCA6\n        De dia: Cracol\xEAs e tretas (ou n\xE3o)\n        De noite: Nudeshot e putaria (ou sim)\n\n        Envio gifs salvos quando se fala putaria.\n        Envio gif random a cada 3 gifs que vcs mandam.\n        ';
        break;
      case 'Sat':
        hjmessage = '\uD83C\uDFAE QUAL \xC9 A BOA / BOSTA DE S\xC1BADO ? \uD83C\uDFA5\n        (des) indica\xE7\xF5es pro fim de semana\n        ';
        break;
      default:
        break;
    }
    bot.sendMessage(msg.chat.id, hjmessage).then(function () {});
  }
});

//  retornar valor quando disserem bitcoin
var btctemp = 5;
// bt().then((data) => { console.log('tres', data); })

bot.onText(/^(.+)?bitcoin(.+)?$/gim, function (msg, match) {
  console.log((0, _moment2.default)().diff(btctemp, 'minutes'), btctemp, (0, _moment2.default)().format('HHmm'));
  if (Math.abs((0, _moment2.default)().diff(btctemp, 'minute')) >= 0 | btctemp === undefined) {
    (0, _convertbtc2.default)('BTC', 'BRL', 1).then(function (data) {
      bot.sendMessage(msg.chat.id, data).then(function () {
        btctemp = _moment2.default.unix(msg.date);
      });
    });
  }
});

//  comando apra retornar bitcoin especcífico
bot.onText(/^\/bdcbtc(\s)(\d)(\s)(\w+)(\s)(\w{3})$|^\/bdcbtc@bomdiacracobot$/, function (msg, match) {
  // console.log(match.length, match[4].toUpperCase(), match[6].toUpperCase(), match[2]);
  (0, _convertbtc2.default)(match[4].toUpperCase(), match[6].toUpperCase(), match[2]).then(function (data) {
    bot.sendMessage(msg.chat.id, data).then(function () {});
  });
});

// comando para verificar bom dias
bot.onText(/^\/bdcstatus$|^\/bdcstatus@bomdiacracobot$/, function (msg, match) {
  var text = '\n  N\xF3s temos ' + bddata.bomdia.length + ' bom dias.\n  N\xF3s temos ' + gifdata.ckdgif.length + ' gifs.\n  N\xF3s temos ' + gifdata.newgif.length + ' novos gifs para validar.\n  N\xF3s temos ' + gifdata.tumblrlist.length + ' tumbler links.\n   ';
  bot.sendMessage(msg.chat.id, text).then(function () {
    // reply sent!
  });
});

// NOTE: buscar um novo algoritmo randomGif

// NOTE: comando para buscar e mostrar gifs repetidos pelo tamanho ou nome
// e perguntar para deletar.

// listen de bom dias
var bdrx = /^(((bo|bu)(\w+)?)(\s?)((di|de|dj|ena)\w+))(\s?|\.+|,|!|\?)?(\s)?(.+)?$/gi;
bot.onText(bdrx, function (msg, match) {
  var _bddata = bddata,
      latebdreceived = _bddata.latebdreceived,
      latebdsay = _bddata.latebdsay,
      bomdia = _bddata.bomdia,
      bdiasvar = _bddata.bdiasvar,
      pontosvar = _bddata.pontosvar;

  newbdv = match[1];
  newptv = match[8];
  newBdia = match[10];
  var bdiaback = void 0,
      notBdia = void 0;

  // checa por arrobas que não podem
  if (newBdia !== undefined) {
    notBdia = newBdia.match(/(\@)/gi, '$1');
    // check se o bom dia foi dado corretamente
  }

  if (newBdia === undefined) {
    newBomDia();
    saveLastSay();
  } else if (notBdia !== null) {
    bdiaback = '\n    NOT. Just Not.\n    Nada de marcar pessoas e botar o meu na reta.';
  } else {
    newBomDia();
    saveLastSay();
    saveLastListen();
  }
  // Gera um bom dia ramdom do banco e checa com os últimos falados.
  function newBomDia() {
    var _loop = function _loop(_i) {
      var bdnum = Math.floor(Math.random() * bomdia.length);
      var bdvnum = Math.floor(Math.random() * bdiasvar.length);
      var ptvnum = Math.floor(Math.random() * pontosvar.length);
      var lbds = latebdsay.findIndex(function (str) {
        return str === bomdia[bdnum];
      });
      var lbdr = latebdreceived.findIndex(function (str) {
        return str === bomdia[bdnum];
      });
      console.log(lbds, lbdr, bdiaback);

      if (lbds === -1 && lbdr === -1) {
        _i = bomdia.length;
        bdiaback = bdiasvar[bdvnum] + pontosvar[ptvnum] + bomdia[bdnum];
      }
      i = _i;
    };

    for (var i = 0; i < bomdia.length; i += 1) {
      _loop(i);
    }
  }

  // Armazena ultimo bom dia falado
  function saveLastSay() {
    latebdsay.shift();
    latebdsay.push(bdiaback);
  }

  // Armazena ultimo bom dia recebido
  function saveLastListen() {
    latebdreceived.shift();
    latebdreceived.push(newBdia);
    // console.log(bddata.latebdreceived);
    checkBdData(bddata.bomdia, newBdia, 'bomdia');
    checkBdvData(newbdv);
  }

  bot.sendMessage(msg.chat.id, bdiaback).then(function () {
    if (newBdia !== undefined) {
      newTwit(bdiaback);
    }
  });
});

// Twitter sender
function newTwit(status) {
  T.post('statuses/update', { status: 'status' }, function (err, data, response) {});
}

// Twitter Replyer
var bdrxtw = /^(@\w+\s)(((bo|bu)(\w+)?)(\s?)((di|de|dj|ena)\w+))(\s?|\.+|,|!|\?)?(\s)?(.+)?$/gi;
function tweetReply(tweet) {
  var _bddata2 = bddata,
      latebdreceived = _bddata2.latebdreceived,
      latebdsay = _bddata2.latebdsay,
      bomdia = _bddata2.bomdia,
      bdiasvar = _bddata2.bdiasvar,
      pontosvar = _bddata2.pontosvar;
  // if (!moment().isBetween(STime, ETime, 'minute', '[]')) {

  var replyTo = tweet.in_reply_to_screen_name; // Who is this in reply to?
  var name = tweet.user.screen_name; // Who sent the tweet?
  var txt = tweet.text; // What is the text?
  var match = bdrxtw.exec(txt);

  if (name !== 'bomdiaabot' && match !== null) {
    // receber bom dia do twitter
    var newbdvtw = match[2];
    var newptvtw = match[9];
    var newBdiatw = match[11];
    checkBdData(bddata.bomdia, newBdiatw, 'bomdia');
    checkBdvData(newbdvtw);

    // enviar bom dia aleatória a um reply do twitter
    var _bdnum = Math.floor(Math.random() * bomdia.length);
    var _bdvnum = Math.floor(Math.random() * bdiasvar.length);
    var _ptvnum = Math.floor(Math.random() * pontosvar.length);
    var bdiaback = bdiasvar[_bdvnum] + pontosvar[_ptvnum] + bomdia[_bdnum];
    var replytxt = '@ ' + name + ' ' + bdiaback;
    T.post('statuses/update', { status: replytxt }, function (err, reply) {
      if (err !== undefined) {
        console.log(err);
      } else {
        // console.log('Tweeted: ' + reply);
      }
    });
  }
}

// checa se a frase de bom dia recebido já existe no banco
function checkBdData(path, newBomDia, origem) {
  // console.log(newBomDia, origem);
  var existe = void 0;
  if (origem === 'gif') {
    existe = gifdata.ckdgif.findIndex(function (elem) {
      return elem === newBomDia;
    });
  } else {
    existe = path.findIndex(function (elem) {
      return elem === newBomDia;
    });
  }
  // Adiciona bom dia no banco de bom dias
  if (existe === -1 && origem === 'gif') {
    path.push(newBomDia);
    newgifCount += 1;
    console.log('Novo gif recebido: ' + newgifCount + ' -> ' + newBomDia);
  } else if (existe === -1 && origem === 'data') {
    path.push(newBomDia);
    newBdiaCount += 1;
    console.log('Novo bom dia recebido: ' + newBdiaCount + ' -> ' + newBomDia);
  }
  if (newBdiaCount >= 10) {
    saveNewdata(bddata);
    newBdiaCount = 0;
  } else if (newgifCount >= 10) {
    saveNewdata(gifdata);
    newgifCount = 0;
  }
}

// checa se a variação de bom dia recebido já existe no banco
function checkBdvData(newbdvalue) {
  var existe = bddata.bdiasvar.findIndex(function (elem) {
    return elem === newbdvalue;
  });

  // Adiciona bom dia no banco de bom dias
  if (existe === -1) {
    bddata.bdiasvar.push(newbdvalue);
    newBdiaCount += 1;
  }
  if (newBdiaCount > 10) {
    saveNewdata(bddata);
    newBdiaCount = 0;
  }
}

// sava arquivo json com bom dias no dropbox a cada 10 novos
function saveNewdata(dataVar) {
  var filename = Object.keys(dataVar).length > 6 ? '/data.json' : '/gifdata.json';
  console.log(filename);
  var json = JSON.stringify(dataVar, null, 2);
  dbx.filesUpload({ path: filename, contents: json, mode: 'overwrite' }).then(function (response) {
    console.log('Data Saved : ' + filename);
    startRead();
  }).catch(function (err) {
    console.log('Error: ' + err);
  });
}