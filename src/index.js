/* TODO: fix duplicated code in paginate/search methods */
import axios from 'axios';
import { load } from 'cheerio';
import { stringify } from 'qs';
import { range, from, empty } from 'rxjs';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { 
    map,
    flatMap,
    distinct,
    concatMap
} from 'rxjs/operators';

const BASE_URL = 'https://animesproject.com';

const request = config => 
    fromPromise(axios(config));

const getContent = (res, selector) =>
    load(res.data)(selector);

const getLinks = (res, selector) =>
   from(getContent(res, selector)
            .map((_, el) => el.attribs['href'])
            .toArray());

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
            flatMap(x => getLinks(x, '.serie-block'))
        );

const fetchVideosLinks = videoUrl => 
    request({
        url: `${BASE_URL}${videoUrl}`,
        method: 'GET'
    })
    .pipe(map(x => getContent(x, '#player_frame').attr('src')));

const fetchEpisodes = animeUrl => 
    request({
        url: `${BASE_URL}${animeUrl}`,
        method: 'GET'
    })
    .pipe(
        flatMap(x => getLinks(x, '.serie-pagina-listagem-videos > div > a')),
        concatMap(fetchVideosLinks)         
    );

const extractVideoUrls = iframeVideoUrl =>
    request({
        url: `${BASE_URL}${iframeVideoUrl}`,
        method: 'GET'
    })
    .pipe(
        map(getScriptSourceContent), 
        flatMap(extractDownloadUrl)
    );

const getScriptSourceContent = res => 
    getContent(res, 'body > script')
        .map((_, x) => x.children[0])
        .filter((_, x) => x && x.data.match(/ZLXSources/)).get(0);

const extractDownloadUrl = scriptSource => {
    if (!scriptSource) return empty();
    const source = /(?:'src':)(.*?)(?:,)/g.exec(scriptSource.data); 

    //TODO: separate video url per quality (mq/hd)
    return source === null ? empty()
        : from(source.map(x => x.replace(/'/g, "")
                               .replace(',', '')
                               .replace('src:', '')
                               .trim()))
}
            
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

search('One Piece')
    .pipe(
        flatMap(fetchEpisodes),
        concatMap(extractVideoUrls),
        distinct()
    )
    .subscribe(console.log);