const Apify = require('apify');

const { saveSet, loadSet } = require('./set-serialization.js');
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
        dedupStoreIntervalMins = 15,
    } = input;

    const set = dedup ? await loadSet() : null;

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

    if (set) {
        setInterval(() => {
            void saveSet(set); // void to indicate ESLint that we don't want to wait for async function to finish
        }, 60000 * dedupStoreIntervalMins);
    }

    Apify.events.on('migrating', async () => {
        if (set) {
            await saveSet(set);
        }
    });

    // Run crawler.
    await crawler.run();
});
