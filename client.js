import fetch from 'node-fetch';
import http from 'http';
import https from 'https';
import crypto from 'crypto';

export class HnapClient {

    // initialized via constructor
    _baseUrl = '';
    _ignoreSsl = false;

    // initialized via login(...)
    _cookie = '';
    _privateKey = '';

    constructor(
        baseUrl = 'http://192.168.100.1',
        ignoreSsl = false
    ) {
        this._baseUrl = baseUrl;
        this._ignoreSsl = ignoreSsl;
    }

    async login(
        username = 'admin',
        password = 'motorola'
    ) {
        const {
            cookie,
            publicKey,
            challenge
        } = await this._getLoginParams(username);

        const privateKey = this._getMd5Digest(publicKey + password, challenge);
        const passKey = this._getMd5Digest(this._encodeUtf8(privateKey), challenge);

        // save this to instance
        this._cookie = cookie;
        this._privateKey = privateKey;

        const payload = {
            Login: {
                Action: 'login',
                Captcha: '',
                Username: username,
                LoginPassword: passKey,
                PrivateLogin: 'LoginPassword',
            }
        };
        const operation = Object.keys(payload)[0];
        const response = await this._performRequest(operation, payload);
        // console.log({ operation, response });
        this._ensureSuccessResult(response, operation);

        return response;
    }

    async getSoftware() {
        return await this._performSingleHnapRequest('GetMotoStatusSoftware');
    }

    async getStartupSequence() {
        return await this._performSingleHnapRequest('GetMotoStatusStartupSequence');
    }

    async getConnectionInfo() {
        return await this._performSingleHnapRequest('GetMotoStatusConnectionInfo');
    }

    async getDownstreamChannelInfo() {
        return await this._performSingleHnapRequest('GetMotoStatusDownstreamChannelInfo');
    }

    async getUpstreamChannelInfo() {
        return await this._performSingleHnapRequest('GetMotoStatusUpstreamChannelInfo');
    }

    async getLog() {
        return await this._performSingleHnapRequest('GetMotoStatusLog');
    }

    async getDownstreamChannelInfoParsed() {
        const downstreamResponse = await this.getDownstreamChannelInfo();

        return downstreamResponse
            .GetMotoStatusDownstreamChannelInfoResponse
            .MotoConnDownstreamChannel
            .split('|+|')
            .map(x => {
                const record = x.split('^');
                // 1^Locked^QAM256^38^393.0^ 0.9^39.2^602^165^|+|
                return {
                    channel: +record[0],
                    lockStatus: record[1],
                    modulation: record[2],
                    channelId: +record[3],
                    frequency: +record[4],
                    power: +record[5],
                    snr: +record[6],
                    corrected: +record[7],
                    uncorrected: +record[8]
                };
            });
    }

    async getUpstreamChannelInfoParsed() {
        const upstreamResponse = await this.getUpstreamChannelInfo();

        return upstreamResponse
            .GetMotoStatusUpstreamChannelInfoResponse
            .MotoConnUpstreamChannel
            .split('|+|')
            .map(x => {
                const record = x.split('^');
                // 1^Locked^SC-QAM^5^5120^35.6^44.3^|+|
                return {
                    channel: +record[0],
                    lockStatus: record[1],
                    channelType: record[2],
                    channelId: +record[3],
                    symbolRate: +record[4],
                    frequency: +record[5],
                    power: +record[6]
                };
            });
    }

    async getLogParsed() {
        const logResponse = await this.getLog();

        const log = logResponse
            .GetMotoStatusLogResponse
            .MotoStatusLogList
            .split('}-{')
            .map(x => {
                const record = x.split('^');
                return {
                    time: `${record[0]} ${record[1]}`,
                    priority: record[2],
                    description: record[3]
                };
            });

        return log;
    }

    // TODO support arbitrary requests via GetMultipleHNAPs

    async _getLoginParams(username) {
        const payload = {
            Login: {
                Action: 'request',
                Username: username,
                LoginPassword: '',
                Captcha: '',
                PrivateLogin: 'LoginPassword'
            }
        };

        const response = await this._performRequest('Login', payload);
        // console.log({ method: '_getLoginParams', response });
        this._ensureSuccessResult(response, 'Login')

        return {
            cookie: this._encodeUtf8(response.LoginResponse.Cookie),
            publicKey: this._encodeUtf8(response.LoginResponse.PublicKey),
            challenge: this._encodeUtf8(response.LoginResponse.Challenge),
        };
    }

    async _performSingleHnapRequest(operation) {
        const payload = {
            [operation]: ''
        };

        const response = await this._performRequest(operation, payload);
        // console.log({ operation, response });
        this._ensureSuccessResult(response, operation);

        return response;
    }

    async _performRequest(operation, payload, skipAuth = false) {
        const url = `${this._baseUrl}/HNAP1/`;
        const headers = {
            SOAPAction: `"http://purenetworks.com/HNAP1/${operation}"`,
        };

        if (!skipAuth) {
            const auth = this._generateAuth(operation);
            headers.HNAP_AUTH = auth;
            headers.Cookie = `uid=${this._cookie}; PrivateKey=${this._privateKey}`
        }

        const response = await fetch(
            url,
            {
                headers,
                method: 'POST',
                body: JSON.stringify(payload),
                agent: parsedUrl => {
                    if (this._ignoreSsl) {
                        return parsedUrl.protocol === 'https:'
                            ? new https.Agent({ rejectUnauthorized: false })
                            : new http.Agent({ rejectUnauthorized: false })
                    }
                    return null;
                }
            });

        if (response.status !== 200) {
            console.error(response);
            throw new Error('Unexpected response.');
        }

        const responseBody = await response.json();
        // console.log({method: '_performRequest', responseBody});

        return responseBody;
    }

    _ensureSuccessResult(response, operation) {
        if (response?.[`${operation}Response`]?.[`${operation}Result`] !== 'OK') {
            console.error(response);
            throw new Error('Unexpected response.');
        }
    }

    _generateAuth(operation) {
        const nonce = (new Date()).getSeconds() * 1000;
        const authKey = `${nonce}"http://purenetworks.com/HNAP1/${operation}"`;
        const auth = this._getMd5Digest(this._privateKey, authKey);
        return `${auth} ${nonce}`;
    }

    _encodeUtf8(value) {
        return Buffer.from(value, 'utf-8');
    }

    _getMd5Digest(secret, value) {
        return crypto.createHmac('md5', secret)
            .update(value)
            .digest('hex')
            .toUpperCase();
    }
}
