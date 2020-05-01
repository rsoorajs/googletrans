import axios from "axios";
import { isSupported, getCode } from "./languages";
import qs from "qs";
import { getToken } from "./google_token";
const agentFile = require("./userAgents.json");
interface Options {
  from?: string;
  to?: string;
  tld?: string;
  client?: string;
}

/**
 *
 * @param {string} text - The text to be translated
 * @param {Object} opts - Options
 * @return {Promise} - Axios Promise
 */
function translate(text: string, opts?: Options) {
  opts = opts || {};
  let e: Error;
  const FROMTO = [opts["from"], opts["to"]];
  FROMTO.forEach((lang) => {
    if (lang && !isSupported(lang)) {
      e = new Error(`The language 「${lang}」is not suppored!`);
      return new Promise((resolve, reject) => {
        reject(e);
      });
    }
  });

  opts.from = opts.from || "auto";
  opts.to = opts.to || "en";
  opts.tld = opts.tld || "com";

  opts.from = getCode(opts.from);
  opts.to = getCode(opts.to);
  const URL = "https://translate.google." + opts.tld + "/translate_a/single";
  const TOKEN = getToken(text);

  const PARAMS = {
    client: opts.client || "t",
    sl: opts.from,
    tl: opts.to,
    hl: "en",
    dt: ["at", "bd", "ex", "ld", "md", "qca", "rw", "rm", "ss", "t"],
    ie: "UTF-8",
    oe: "UTF-8",
    otf: 1,
    ssel: 0,
    tsel: 0,
    kc: 7,
    q: text,
    tk: TOKEN,
  };

  const HEADERS = {
    "User-Agent": getUserAgent(),
    "Accept-Encoding": "gzip",
  };

  return axios({
    url: URL,
    params: PARAMS,
    headers: HEADERS,
    timeout: 3 * 1000,
    paramsSerializer: (params) => {
      return qs.stringify(params, { arrayFormat: "repeat" });
    },
  })
    .then((res) => {
      let result = {
        text: "",
        pronunciation: "",
        from: {
          language: {
            //language
            hasCorrectedLang: false, // correct source language
            iso: "", // source language
          },
          correct: {
            // correct source translate text
            hasCorrectedText: false, // correct source text
            value: "", // correct value
          },
        },
        to: {
          translations: [], // multiple translations
        },
        raw: "",
      };
      if (res.status === 200) result.raw = res.data;
      const body = res.data;
      const a = body[0] && body[0];
      a.forEach((obj: string) => {
        if (obj[0]) {
          result.text += obj[0];
        }
        if (obj[2]) {
          result.pronunciation += obj[2];
        }
      });

      if (body[2] === body[8][0][0]) {
        result.from.language.iso = body[2];
      } else {
        result.from.language.hasCorrectedLang = true;
        result.from.language.iso = body[8][0][0];
      }

      if (body[1][0][2]) result.to.translations = body[1][0][2];

      if (body[7] && body[7][0]) {
        let str = body[7][0];

        str = str.replace(/<b><i>/g, "[");
        str = str.replace(/<\/i><\/b>/g, "]");

        result.from.correct.value = str;

        let a = false;
        let b = false;
        if (body[7][5] === true) {
          a = true;
        } else {
          b = true;
        }
        if (a || b) {
          result.from.correct.hasCorrectedText = true;
        }
      }
      return result;
    })
    .catch((error) => {
      throw error;
    });
}

/**
 * Generating a Random User Agent
 * @return {String} - User Agent string
 */
function getUserAgent() {
  // const agentFile = fs.readFileSync("./userAgents.json");
  const browsers = JSON.parse(agentFile)["browsers"];
  const browsersKeys = Object.keys(browsers);
  const browserNmb = getRandom(0, browsersKeys.length - 1);
  const browsersKey = browsersKeys[browserNmb];
  const userAgenLength = browsers[browsersKey].length - 1;
  const userAgentNmb = getRandom(0, userAgenLength);
  return browsers[browsersKey][userAgentNmb];
}

/**
 * Get an integer number between n and m.
 * @param {number} n - Min integer number
 * @param {number} m - Max integer number
 * @returns {number} - random number
 */
function getRandom(n: number, m: number) {
  var num = Math.floor(Math.random() * (m - n + 1) + n);
  return num;
}

export default translate;
export { translate, getRandom, getUserAgent };
