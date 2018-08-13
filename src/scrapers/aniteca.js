import { load } from 'cheerio';
import { extname } from 'path';
import { range, from, empty } from 'rxjs';
import { map, concatMap, mergeMap, distinct } from 'rxjs/operators';
import { getAnimesProject, postAnimesProject } from '../adapters/requests';

const filterVideos = url => 
    ['.mp4', '.mkv', '.flv', '.avi'].includes(extname(url)) 

const getContent = (res, selector) =>
    load(res.data)(selector);

const parseLinksToStream = (res, selector) =>
   from(getContent(res, selector)
            .map((_, el) => el.attribs['href'])
            .toArray());

const getLastPage = res =>
    parseInt(getContent(res, '.paginacao-container > ul > li a')
                .last()
                .attr('href'));

const fetchVideosLinks = videoUrl => 
    getAnimesProject(videoUrl)
        .pipe(map(x => getContent(x, '#player_frame').attr('src')));

const fetchEpisodes = animeUrl => 
    getAnimesProject(animeUrl)
        .pipe(
            mergeMap(x => parseLinksToStream(x, '.serie-pagina-listagem-videos > div > a')),
            concatMap(fetchVideosLinks)         
        );

const extractVideoUrls = iframeVideoUrl =>
    getAnimesProject(iframeVideoUrl)
        .pipe(
            map(getScriptSourceContent), 
            mergeMap(extractDownloadUrl)
        );

const getScriptSourceContent = res => 
    getContent(res, 'body > script')
        .map((_, x) => x.children[0])
        .filter((_, x) => x && x.data.match(/ZLXSources/)).get(0);

const extractDownloadUrl = scriptSource => {
    if (!scriptSource) return empty();    
    const source =  scriptSource.data
                                .replace(/\s/g, "")
                                .match(/(?:'src':)(.*?)(?:,)/gi);

    return source === null ? empty()
        : from(source.map(x => x.replace(/'/g, "")
                                .replace(/}/g, "")
                                .replace(/]/g, '')
                                .replace(',', '')
                                .replace('src:', '')
                                .trim())
                                .filter(filterVideos));
}

const paginate = (searchTerm, page) => 
    postAnimesProject({
        urlPath: `/listar-series/`,
        data: {
            pagina: page,
            busca: searchTerm 
        }
    })
    .pipe(
        mergeMap(x => parseLinksToStream(x, '.serie-block')),
        mergeMap(fetchEpisodes),
        mergeMap(extractVideoUrls) 
    );
            
const search = (searchTerm = '') => 
    postAnimesProject({
        urlPath: `/listar-series/`,
        data: {
            pagina: 1,
            busca: searchTerm 
        }
    })
    .pipe(
        mergeMap(res => range(1, getLastPage(res))),
        mergeMap(page => paginate(searchTerm, page)),
        distinct()
    );

export { search };