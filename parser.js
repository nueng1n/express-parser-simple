const { Writable } = require("node:stream");
const util = require('util');
const parseString = util.promisify(require('xml2js').parseString);

const querystring = require('querystring');



class XmlParser {
    constructor(xmlData) {
        this.xmlData = xmlData;
    }

    parse() {
        return parseString(this.xmlData, { trim: true });
    }
}

class ReqWriteStream extends Writable {
    constructor({ highWaterMark, reqHeaders }) {
        super({ highWaterMark });

        this.chunks = [];
        this.body = ''
        this.rawdata = ''
        this.reqHeaders = reqHeaders

        this.chunksSize = 0;
    }

    _write(chunk, encoding, callback) {
        this.chunks.push(chunk);
        this.chunksSize = this.chunksSize + 1
        callback()
    }

    async _final(callback) {
        // console.log('final');

        this.rawdata = Buffer.concat(this.chunks).toString();

        if (this.reqHeaders['content-type'].includes("application/json")) {
            try {
                this.body = JSON.parse(this.rawdata);

            } catch (err) {
                callback(err)
            }
        }

        if (this.reqHeaders['content-type'].includes("application/xml")) {

            const xmlParser = new XmlParser(this.rawdata);

            try {
                this.body = await xmlParser.parse()

            } catch (err) {
                callback(err)
            }

        }

        if (this.reqHeaders['content-type'].includes("text/plain")) {

            this.body = this.rawdata

        }

        if (this.reqHeaders['content-type'].includes("application/x-www-form-urlencoded")) {

            this.body = Object.assign({}, querystring.parse(this.rawdata, '&', '='));
        }


        callback()
    }

    _destroy(error, callback) {
        // console.log('destory');

        if (error != null || error != undefined) {
            callback(error)
        }
        this.chunks = []
        callback()
    }

}


function customParser(req, res, next) {

    // console.log(req.path);

    const stream = new ReqWriteStream({ reqHeaders: req.headers });

    const contentTypes = ['application/json', 'application/xml', 'text/plain'];
    let found = false;

    if( req.headers['content-type'] !=null && req.headers['content-type'] != undefined){
        for (const item of contentTypes) {
            if (req.headers['content-type'].includes(item)) {
                found = true;
                break;
            }
        }
    }
    
    if (!found) {
        next()
    } else {
        req.pipe(stream)

        stream.on('error', (err) => {
            console.error('ReqWriteStream encountered an error:', err);
            next()
        });

        stream.on('finish', (err) => {
            if (err != null || err != undefined) {
                throw err
            }

            req['body'] = stream.body

            next()
        })


    }

}



module.exports = { customParser };