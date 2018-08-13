import { search } from './scrapers/aniteca';

search('piece')
    .subscribe(console.log, console.error, () => console.log('done!'));