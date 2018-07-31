import { load } from 'cheerio';
import { range, from, empty } from 'rxjs';
import { map, flatMap, concatMap } from 'rxjs/operators';
import { getAnimesProject, postAnimesProject } from './adapters/requests';

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
            flatMap(x => parseLinksToStream(x, '.serie-pagina-listagem-videos > div > a')),
            concatMap(fetchVideosLinks)         
        );

const extractVideoUrls = iframeVideoUrl =>
    getAnimesProject(iframeVideoUrl)
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

const paginate = (searchTerm, page) => 
    postAnimesProject({
        urlPath: `/listar-series/`,
        data: {
            pagina: page,
            busca: searchTerm 
        }
    })
    .pipe(flatMap(x => parseLinksToStream(x, '.serie-block')));
            
export const search = (searchTerm = '') => 
    postAnimesProject({
        urlPath: `/listar-series/`,
        data: {
            pagina: 1,
            busca: searchTerm 
        }
    })
    .pipe(
        flatMap(res => range(1, getLastPage(res))),
        concatMap(page => paginate(searchTerm, page))
    );