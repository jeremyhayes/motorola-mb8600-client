import fetch from 'node-fetch';
import http from 'http';
import https from 'https';
import crypto from 'crypto';

const httpAgent = new http.Agent({
    rejectUnauthorized: false
})
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

export class HnapClient {
    _cookie = '';
    _privateKey = '';

    async login(username, password) {
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
        const response = await this._performRequest('Login', payload);
        // console.log({ method: 'login', response });

        if (response.LoginResponse.LoginResult !== 'OK') {
            console.error(response);
            throw new Error('Unexpected response.');
        }

        return response;
    }

    async getStatus() {
        const payload = {
            GetMultipleHNAPs: {
                GetMotoStatusSoftware: '',
                GetMotoStatusXXX: ''
            }
        };
        const response = await this._performRequest('GetMultipleHNAPs', payload);
        // console.log({ method: 'getStatus', response });

        if (response.GetMultipleHNAPsResponse.GetMultipleHNAPsResult !== 'OK') {
            console.error(response);
            throw new Error('Unexpected response.');
        }

        return response;
    }

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

        if (response.LoginResponse.LoginResult !== 'OK') {
            console.error(response);
            throw new Error('Unexpected response.');
        }

        return {
            cookie: this._encodeUtf8(response.LoginResponse.Cookie),
            publicKey: this._encodeUtf8(response.LoginResponse.PublicKey),
            challenge: this._encodeUtf8(response.LoginResponse.Challenge),
        };
    }

    async _performRequest(operation, payload, skipAuth = false) {
        const url = 'https://192.168.100.1/HNAP1/';
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
                agent: _url => _url.protocol === 'https:' ? httpsAgent : httpAgent
            });

        if (response.status !== 200) {
            console.error(response);
            throw new Error('Unexpected response.');
        }

        const responseBody = await response.json();
        // console.log({method: '_performRequest', responseBody});

        return responseBody;
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