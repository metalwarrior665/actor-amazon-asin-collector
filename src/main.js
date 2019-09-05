const Apify = require('apify');
const BigSet = require('big-set');

const SessionsCheerioCrawler = require('./session-cheerio-crawler');
const makeHandlePageFunctionWithContext = require('./handle-page-function-with-context.js');

// TODO: Add an option to limit number of results for each keyword
Apify.main(async () => {
    // Get queue and enqueue first url.
    const requestQueue = await Apify.openRequestQueue();
    const input = await Apify.getInput();
    const {
        categoryUrls,
        proxyConfiguration = { useApifyProxy: true },
        maxConcurrency,
        maxRequestRetries,
        outputFields,
        dedup,
    } = input;

    const set = dedup ? new BigSet() : null;

    for (const url of categoryUrls) {
        await requestQueue.addRequest({
            url,
        });
    }

    // Create crawler.
    const crawler = new SessionsCheerioCrawler({
        requestQueue,
        maxConcurrency,
        useApifyProxy: proxyConfiguration.useApifyProxy,
        apifyProxyGroups: proxyConfiguration.apifyProxyGroups,
        handlePageTimeoutSecs: 2.5 * 60 * 1000,
        maxRequestRetries,
        autoscaledPoolOptions: {
            systemStatusOptions: {
                maxEventLoopOverloadedRatio: 0.8,
            },
            snapshotterOptions: {
                maxBlockedMillis: 200,
            },
        },
        handlePageFunction: makeHandlePageFunctionWithContext({ requestQueue, outputFields, set }),
    });

    // Run crawler.
    await crawler.run();
});
