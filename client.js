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

        const url = 'https://192.168.100.1/HNAP1/';
        const auth = this._generateAuth('Login');
        const headers = {
            HNAP_AUTH: auth,
            SOAPAction: 'http://purenetworks.com/HNAP1/Login',
            Cookie: `uid=${cookie}; PrivateKey=${this._privateKey}`
        };
        const payload = {
            Login: {
                Action: 'login',
                Captcha: '',
                Username: username,
                LoginPassword: passKey,
                PrivateLogin: 'LoginPassword',
            }
        };
        const response = await fetch(
            url,
            {
                headers,
                method: 'POST',
                body: JSON.stringify(payload),
                agent: _url => _url.protocol === 'https:' ? httpsAgent : httpAgent
            }
        );

        const responseBody = await response.json();
        // console.log({ method: 'login', response, responseBody });

        if (responseBody.LoginResponse.LoginResult !== 'OK') {
            console.error(responseBody);
            throw new Error('Unexpected response.');
        }

        return responseBody;
    }

    async getStatus() {
        const url = 'https://192.168.100.1/HNAP1/';
        const auth = this._generateAuth('GetMultipleHNAPs');
        const headers = {
            HNAP_AUTH: auth,
            SOAPAction: '"http://purenetworks.com/HNAP1/GetMultipleHNAPs"',
            Cookie: `uid=${this._cookie}; PrivateKey=${this._privateKey}`
        };
        const payload = {
            GetMultipleHNAPs: {
                GetMotoStatusSoftware: '',
                GetMotoStatusXXX: ''
            }
        };
        const response = await fetch(
            url,
            {
                headers,
                method: 'POST',
                body: JSON.stringify(payload),
                agent: _url => _url.protocol === 'https:' ? httpsAgent : httpAgent
            });

        const responseBody = await response.json();
        // console.log({method: 'getStatus', response: responseBody})

        if (responseBody.GetMultipleHNAPsResponse.GetMultipleHNAPsResult !== 'OK') {
            console.error(responseBody);
            throw new Error('Unexpected response.');
        }

        return responseBody;
    }

    async _getLoginParams(username) {
        const url = 'https://192.168.100.1/HNAP1/';
        const headers = {
            SOAPAction: 'http://purenetworks.com/HNAP1/Login'
        };
        const payload = {
            Login: {
                Action: 'request',
                Username: username,
                LoginPassword: '',
                Captcha: '',
                PrivateLogin: 'LoginPassword'
            }
        };
        const response = await fetch(
            url,
            {
                headers,
                body: JSON.stringify(payload),
                method: 'POST',
                agent: _url => _url.protocol === 'https:' ? httpsAgent : httpAgent,
            });

        const responseBody = await response.json();
        // console.log({ method: '_getLoginParams', response: responseBody });

        if (responseBody.LoginResponse.LoginResult !== 'OK') {
            console.error(responseBody);
            throw new Error('Unexpected response.');
        }

        return {
            cookie: this._encodeUtf8(responseBody.LoginResponse.Cookie),
            publicKey: this._encodeUtf8(responseBody.LoginResponse.PublicKey),
            challenge: this._encodeUtf8(responseBody.LoginResponse.Challenge),
        };
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
