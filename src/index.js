/* TODO: fix duplicated code in paginate/search methods */

import axios from 'axios';
import { range } from 'rxjs';
import { load } from 'cheerio';
import { stringify } from 'qs';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { 
    map, 
    flatMap,
    concatMap
} from 'rxjs/operators';

const BASE_URL = 'https://animesproject.com';
const MAX_CONCURRENT_DOWNLOADS = 4;

const request = config => 
    fromPromise(axios(config));

const getContent = (res, selector) =>
    load(res.data)(selector);

const getLinks = (res, selector) =>
    getContent(res, selector)
        .map((_, el) => el.attribs['href'])
        .toArray();

const paginate = (res, term) => 
    range(1, (parseInt(
                getContent(res, '.paginacao-container > ul > li a')
                    .last()
                    .attr('href')
        )))
        .pipe(
            concatMap(page => request({
                url: `${BASE_URL}/listar-series/`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                withCredentials: true,
                data: stringify({
                    categoria: 9,
                    letra: '[a-z]',
                    qnt: 25,
                    tipos: 'Episódio|Filme|Extra',
                    status: 'Em andamento|Pausado|Concluído',
                    inicioMin: 1950,
                    inicioMax: 2018,
                    notaMin: 0.00,
                    notaMax: 10.00,
                    pagina: page,
                    busca: term 
                })
            })), 
            map(x => getLinks(x, '.serie-block'))
        );

const fetchEpisodes = animeUrl => 
    request({
        url: `${BASE_URL}${animeUrl}`,
        method: 'GET'
    })
    .pipe(map(x => getLinks(x, '.serie-pagina-listagem-videos > div > a')));
        
const search = (searchTerm, page) => 
    request({
        url: `${BASE_URL}/listar-series/`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
        },
        withCredentials: true,
        data: stringify({
            categoria: 9,
            letra: '[a-z]',
            qnt: 25,
            tipos: 'Episódio|Filme|Extra',
            status: 'Em andamento|Pausado|Concluído',
            inicioMin: 1950,
            inicioMax: 2018,
            notaMin: 0.00,
            notaMax: 10.00,
            pagina: page || 1,
            busca: searchTerm || '' 
        })
    })
    .pipe(flatMap(fm => paginate(fm, searchTerm)));

search().pipe(flatMap(fetchEpisodes)).subscribe(console.log);