/* TODO: fix duplicated code in paginate/search methods */
import { load } from 'cheerio';
import { range, from, empty } from 'rxjs';
import { map, flatMap, distinct, concatMap } from 'rxjs/operators';
import { getAnimesProject, postAnimesProject } from './common/requests';

const getContent = (res, selector) =>
    load(res.data)(selector);

const getLinks = (res, selector) =>
   from(getContent(res, selector)
            .map((_, el) => el.attribs['href'])
            .toArray());

const getLastPage = res =>
    parseInt(getContent(res, '.paginacao-container > ul > li a')
                .last()
                .attr('href'));

const paginate = (res, term) => 
    range(1, getLastPage(res))
        .pipe(
            concatMap(page => postAnimesProject({
                urlPath: `/listar-series/`,
                data: {
                    pagina: page,
                    busca: term 
                }
            })), 
            flatMap(x => getLinks(x, '.serie-block'))
        );

const fetchVideosLinks = videoUrl => 
    getAnimesProject(videoUrl)
        .pipe(map(x => getContent(x, '#player_frame').attr('src')));

const fetchEpisodes = animeUrl => 
    getAnimesProject(animeUrl)
        .pipe(
            flatMap(x => getLinks(x, '.serie-pagina-listagem-videos > div > a')),
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
            
const search = (searchTerm, page) => 
    postAnimesProject({
        urlPath: `/listar-series/`,
        data: {
            pagina: page || 1,
            busca: searchTerm || '' 
        }
    })
    .pipe(flatMap(fm => paginate(fm, searchTerm)));

search('One Piece')
    .pipe(
        flatMap(fetchEpisodes),
        concatMap(extractVideoUrls),
        distinct()
    )
    .subscribe(console.log);