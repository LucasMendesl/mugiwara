import { stringify } from 'qs';
import { get, post } from 'axios';
import { fromPromise } from 'rxjs/observable/fromPromise';

const NOW = new Date();

const CONCURRENT_REQUESTS_THRESHOLD = 4;
const BASE_URL = 'https://animesproject.com';

const AXIOS_REQUEST_COMMON_CONFIG = {
    withCredentials: true,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
    }    
};

const transformPostData = data =>
    stringify(Object.assign({}, {
        categoria: 9,
        letra: '[a-z]',
        qnt: 25,
        tipos: 'Episódio|Filme|Extra',
        status: 'Em andamento|Pausado|Concluído',
        inicioMin: 1950,
        inicioMax: NOW.getFullYear(),
        notaMin: 0.00,
        notaMax: 10.00    
    }, data));

export const getAnimesProject = (urlPath, config = {}) =>
    fromPromise(get(`${BASE_URL}${urlPath}`, Object.assign({}, AXIOS_REQUEST_COMMON_CONFIG, config)));

export const postAnimesProject = ({ urlPath, data }) => 
    fromPromise(post(`${BASE_URL}${urlPath}`, transformPostData(data), 
        Object.assign({}, AXIOS_REQUEST_COMMON_CONFIG, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',                
            }    
        }),
    ));