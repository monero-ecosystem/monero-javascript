'use strict';

module.exports = {
    "plugins": ['./configs/jsdoc_plugins'],
    "recurseDepth": 100,
    "source": {
        "include": ["./index.js", "./src/main/js/"],
        "includePattern": ".+\\.js(doc|x)?$",
        "excludePattern": "(^|\\/|\\\\)_"
    },
    "sourceType": "module",
    "tags": {
        "allowUnknownTags": true,
        "dictionaries": ["jsdoc","closure"]
    },
    "templates": {
        "cleverLinks": false,
        "monospaceLinks": false
    }
};