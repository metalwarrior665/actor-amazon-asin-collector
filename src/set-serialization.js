const Apify = require('apify');
const BigSet = require('big-set');

const RECORD_LENGTH = 1e6;

module.exports.saveSet = async (set) => {
    const keys = set.keys();
    const slices = [];
    for (let i = 0; i < keys.length; i += RECORD_LENGTH) {
        const slice = keys.slice(i, i + RECORD_LENGTH);
        slices.push({ index: i, slice });
    }
    console.log(`SET SAVE --- Will store ${keys.length} ASINs`);
    const promises = slices.map(async ({ index, slice }) => {
        await Apify.setValue(`SET-${index}`, slice);
    });

    await Promise.all(promises);
    console.log(`SET SAVE --- Stored ${keys.length} ASINs`);
};

module.exports.loadSet = async () => {
    const store = await Apify.openKeyValueStore();
    const setStoreKeys = [];
    await store.forEachKey(async (key, index, info) => {
        if (key.startsWith('SET')) {
            setStoreKeys.push(key);
        }
    });

    if (setStoreKeys.length === 0) {
        return new BigSet();
    }

    console.log(`SET LOAD --- Will load ${setStoreKeys.length} store reocrds`);

    const promisesOfArrays = setStoreKeys.map(async (key) => {
        return Apify.getValue(key);
    });

    const slices = await Promise.all(promisesOfArrays);
    const set = new BigSet();
    for (const slice of slices) {
        for (const key of slice) {
            set.add(key);
        }
    }
    return set;
};
