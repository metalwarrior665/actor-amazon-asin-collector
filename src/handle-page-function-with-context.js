const Apify = require('apify');

const { parsePageNumber, parseCategoryId } = require('./utils.js');
const parseNextPage = require('./parse-next-page.js');

// We export a function with a context for convenience
module.exports = (context) => async ({ $, request, html }) => {
    const {
        requestQueue,
        outputFields,
        set,
    } = context;

    const title = $('title').text();
    if (title.toLowerCase().includes('robot check')) {
        throw new Error(`CATPCHA n. ${request.retryCount + 1} --- ${request.url}`);
    }

    const categoryId = parseCategoryId(request.url);
    const page = parsePageNumber(request.url);

    let asins = [];
    $('[data-asin]').each(function (i) {
        asins.push({
            asin: $(this).attr('data-asin'),
            page,
            rank: i + 1,
            categoryId,
        });
    });

    if (set) {
        const newAsins = [];
        asins.forEach((item) => {
            if (!set.has(item.asin)) {
                set.add(item.asin);
                newAsins.push(item);
            }
        });
        console.log(`Dedup set info: ${newAsins.length}/${asins.length} ===> ${set.size}`);
        asins = newAsins;
    }

    if (outputFields) {
        asins = asins.map((asin) => {
            const newAsin = { asin: asin.asin };
            outputFields.forEach((key) => {
                newAsin[key] = asin[key];
            });
            return newAsin;
        });
    }

    await Apify.pushData(asins);

    const maybeNextPageUrl = parseNextPage($, request.url);
    // console.log('parsed url:', maybeNextPageUrl);

    if (maybeNextPageUrl) {
        await requestQueue.addRequest({ url: maybeNextPageUrl });
    } else {
        console.log(`REACHED LAST PAGE (Saving HTML to kv store) --- ${categoryId} --- ${request.url}`);
        await Apify.setValue(categoryId, html, { contentType: 'text/html' });
    }

    console.log(`Extracted: ${asins.length}, next page: ${!!maybeNextPageUrl} --- ${request.url}`);
};
