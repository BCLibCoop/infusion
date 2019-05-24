/*
Copyright 2011-2016 OCAD University
Copyright 2011 Lucendo Development Ltd.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

var fluid_3_0_0 = fluid_3_0_0 || {};

(function ($, fluid) {
    "use strict";


    /** Explodes a localised filename, perhaps with extension, into a number of variants with the basename followed
     * by underscores and increasingly specialised locale names, taking into account a possible default locale.
     * E.g. if `filename` is `messages.json`, `locale` is `fr_CH` and `defaultLocale` is `en`, this function will return
     * `["messages_en.json", "messages_fr.json", "messages_fr_CH.json"]`.
     *
     * This is similar to the algorithm specified for localised resources in Java, e.g. documented at
     * https://docs.oracle.com/javase/6/docs/api/java/util/ResourceBundle.html#getBundle%28java.lang.String,%20java.util.Locale,%20java.lang.ClassLoader%29
     * @param {String} fileName - The base filename or URL to be exploded
     * @param {String} locale - A locale name with respect to which to perform the explosion
     * @param {String} [defaultLocale] - An optional default locale to fall back on in the case none of the localised
     * variants could be located.
     * @return {String[]} An array of localised filenames to be fetched, in increasing order of specificity. In
     * practice, we expect the last member of this array which can be fetched to correspond to the most desirable
     * localised version of the resource.
     */
    fluid.explodeLocalisedName = function (fileName, locale, defaultLocale) {
        var lastDot = fileName.lastIndexOf(".");
        if (lastDot === -1 || lastDot === 0) {
            lastDot = fileName.length;
        }
        var baseName = fileName.substring(0, lastDot);
        var extension = fileName.substring(lastDot);

        var segs = locale.split("_");

        var exploded = fluid.transform(segs, function (seg, index) {
            var shortSegs = segs.slice(0, index + 1);
            return baseName + "_" + shortSegs.join("_") + extension;
        });
        if (defaultLocale) {
            exploded.unshift(baseName + "_" + defaultLocale + extension);
        }
        exploded.unshift(fileName);
        return exploded;
    };

    /** A specification for a (possibly asynchronously available) resource. This might be fetched a URL,
     * the filesystem, or some other source requiring an asynchronous interaction. These are duck-typed by the
     * presence of particular fields, such as `url` or `path` which signal to the decoder that a particular
     * implementation should be activated in a particular environment (e.g. an AJAX request or the node HTTP API)
     * @typedef {Object} ResourceSpec
     * @member {String} [locale] An optional locale which will be used to look for a localised variant of a resource
     * @member {String} [defaultLocale] A fallback locale to be used in the case that the variant localised to `locale`
     * cannot be loaded
     * @member {String} [dataType] An optional specification of a data type - this may be "JSON", "HTML" or some other
     * value indicating that the fetched resource will be parsed into some further representation before it is placed
     * into the `parsed` field of the resulting resource.
     */

    /** A ResourceSpec designating that a resource will be loaded from a URL via an HTTP or HTTPS request.
     * @typedef {ResourceSpec} UrlResourceSpec
     * @member {String} url - The full url from which the resource will be loaded.
     * @member {Object} options - A freeform options structure which will be forwarded without interpretation to the
     * underlying transport, e.g. XmlHttpRequest or node's http/https request
     */

    /** A ResourceSpec designating that a resource will be loaded from the filesystem
     * @typedef {ResourceSpec} PathResourceSpec
     * @member {String} path - The path in the filesystem from which the resource will be loaded. This will be sent
     * to `fluid.resolveModulePath` and so may begin with a module-relative specification such as "%infusion"
     * @member {String} charEncoding - The character encoding to be used when reading the file - this defaults to "utf-8"
     */

    /** A ResourceSpec designating that a resource will be loaded from a DataSource
     * @typedef {ResourceSpec} DataSourceResourceSpec
     * @member {String} dataSource - An IL reference to a DataSource whose `get` method will be used to fetch the resource
     * @member {Object} [directModel] - An optional argument to be sent to the DataSource's `get` method to specify the resource
     * to be loaded
     */

    /** A free hash of names to resourceSpec structures, the currency of many functions in this file
     * @typedef {Object.<String, ResourceSpec>} ResourceSpecs
     */

    /** The options provided to construct a ResourceFetcher
     * @typedef {Object} ResourceFetcherOptions
     * @member {String} defaultLocale - The value of `defaultLocale` to be imputed for any `ResourceSpec` entry that has
     * not filled it in
     */

    /** Accepts a hash of free keys to ResourceSpecs and a callback. The fetch of these will be initiated, and the
     * callback called with the fetched resources when they are all complete.
     * @param {Object.<String, ResourceSpec>} resourceSpecs - Hash of keys to ResourceSpecs designating resources to be fetched.
     * This will be modified tby this function
     * @param {Function} callback - A callback which will receive the filled-in resourceSpecs structure when I/O is complete
     * @param {ResourceFetcherOptions} options - A structure of options to a `ResourceFetcher`.
     * @return {ResourceFetcher} A lightweight component (not an Infusion component) coordinating the I/O process
     */
    fluid.fetchResources = function (resourceSpecs, callback, options) {
        var that = fluid.makeResourceFetcher(resourceSpecs, callback, options);
        that.fetchAll();
        return that;
    };

    /** The concept behind the "explode/condense" for Locales group of functions is to implement a straightforward
     * though unperformant model of client-side fallback localisation. Each user-supplied resourceSpec is exploded
     * into a series of progressively less refined locale fallback variants. Each of these is then fetched,
     * and then the results are recombined after fetching in order to only report a resource to the root user's
     * spec for the most specific localised variant that made a response.
     */

    /** Explode the supplied `resourceSpec` structures into an expanded set holding one entry for each localised
     * variant that should be queried when using a fallback algorithm. For each `resourceSpec` this will be generated
     * by calling `fluid.explodeLocalisedName` on the resourceSpec's path/url field, storing the results of this in
     * a new `resourceSpec` field `localeExploded` and generating an array of fresh resourceSpecs in a field
     * `localeExplodedPaths`.
     * @param {resourceFetcher} resourceFetcher - The parent `resourceFetcher` holding the resourceSpecs. This will only be used to query
     * for the `defaultLocale` member in its options.
     * @param {ResourceSpecs} resourceSpecs - The specs to be exploded. These will be modified by this function,
     * to include new fields `localeExploded`, `localeExplodedSpecs` and in addition, the `locale` and `defaultLocale` fields
     * be filled in.
     * @return {ResourceSpecs} the modified argument `resourceSpecs` with exploded specs and other fields filled in
     */
    fluid.fetchResources.explodeForLocales = function (resourceFetcher, resourceSpecs) {
        fluid.each(resourceSpecs, function (resourceSpec) {
            // If options.defaultLocale is set, it will replace any
            // defaultLocale set on an individual resourceSpec
            if (resourceFetcher.options.defaultLocale && resourceSpec.defaultLocale === undefined) {
                resourceSpec.defaultLocale = resourceFetcher.options.defaultLocale;
            }
            if (resourceSpec.locale === undefined) {
                resourceSpec.locale = resourceSpec.defaultLocale;
            }

            resourceSpec.loader = fluid.resourceLoader.resolveResourceLoader(resourceSpec);
            if (resourceSpec.locale) {
                var pathKey = resourceSpec.loader.pathKey;
                resourceSpec.localeExploded = fluid.explodeLocalisedName(resourceSpec[pathKey], resourceSpec.locale, resourceSpec.defaultLocale);
                resourceSpec.localeExplodedSpecs = fluid.transform(resourceSpec.localeExploded, function (oneExploded) {
                    var togo = {
                        loader: resourceSpec.loader
                    };
                    togo[pathKey] = oneExploded;
                    return togo;
                }, fluid.fetchResources.prepareRequestOptions);
            }
        });
        return resourceSpecs;
    };

    // Returns an array of settled promises
    /** Accepts an array of ResourceSpecs as exploded by `fluid.fetchResources.explodeForLocales` into a
     * member `localeExplodedSpecs" and sets up I/O to query them for the matching resource. The current implementation
     * will query each exploded spec regardless of error, and the results will be collated by `fluid.fetchResources.condenseExplodedLocales"
     * @param {ResourceSpec[]} localeExplodedSpecs - Array of ResourceSpecs to be queried for the appropriately localised
     * version of a resource
     * @param {OneResourceLoader} loader - a loader suitable for loading all specs in the array
     * @return {Promise} A promise which resolves to an array of structures each holding `{resolved: payload}` or
     * `{rejected: error}` for each queried resource
     */
    fluid.fetchResources.launchExplodedLocales = function (localeExplodedSpecs, loader) {
        var promiseArray = fluid.transform(localeExplodedSpecs, loader, function (promise) {
            var promiseToGo = fluid.promise();
            promise.then(function (resolve) {
                promiseToGo.resolve({resolved: resolve});
            }, function (error) {
                promiseToGo.resolve({rejected: error});
            });
            return promiseToGo;
        });
        var settledArrayPromise = fluid.promise.sequence(promiseArray);
        return settledArrayPromise;
    };

    /** Accepts the settled promise array dispensed from `fluid.fetchResources.launchExplodedLocales` and the original
     * resourceSpec, and condenses back into a single promise picking either the first successfully resolved request,
     * if any, or a rolled-up error payload
     * @param {ResourceSpec} resourceSpec - The original resourceSpec that gave rise to the `localeExplodedSpecs` that
     * gave rise to the supplied `settledArray`
     * @param {Object[]} settledArray - The array of resolutions yielded by the promise returned from
     * `fluid.fetchResources.launchExplodedLocales`
     * @return {Promise} A promise yielding either the first successful fetch for a localised resource, or a rolled-up
     * error listing the paths which were queried
     */
    fluid.fetchResources.condenseExplodedLocales = function (resourceSpec, settledArray) {
        var togo = fluid.promise();
        settledArray.reverse();
        var lastNonError = fluid.find(settledArray, function (settled) {
            return settled.resolved;
        });
        if (lastNonError) {
            togo.resolve(lastNonError);
        } else {
            togo.reject({
                isError: true,
                message: "No localised variants of the resource could be found at any of the paths "
                    + resourceSpec.localeExploded.join(", ")
            });
        }
        return togo;
    };

    /** Given a resourceSpec and a suitable loader for its resource, return a task which yields either a localised
     * version of the reource, if it had been determined to require localisation by `fluid.fetchResources.explodeForLocales`,
     * or else just the simple action of the supplied loader on the resource
     * @param {ResourceSpec} resourceSpec - The resourceSpec for which a loader task is to be resolved
     * @param {OneResourceLoader} loader - A loader suitable for loading the supplied resource
     * @return {Task} A task which loads the resource
     */
    fluid.fetchResources.resolveLoaderTask = function (resourceSpec, loader) {
        if (resourceSpec.localeExplodedSpecs) {
            return function () {
                var togo = fluid.promise();
                var settledArrayPromise = fluid.fetchResources.launchExplodedLocales(resourceSpec.localeExplodedSpecs, loader);
                settledArrayPromise.then(function (settledArray) {
                    var condensed = fluid.fetchResources.condenseExplodedLocales(resourceSpec, settledArray);
                    fluid.promise.follow(condensed, togo);
                });
                return togo;
            };
        } else {
            return function () {
                return loader(resourceSpec);
            };
        }
    };

    /** Invoked at the resolution of each individual I/O process in order to check whether the resource fetching process
     * as a whole has reached completion - if so, the overall `completionPromise` is fired.
     * @param {ResourceSpecs} resourceSpecs - The complete set of ResourceSpecs in the process of being fetched. The
     * promise disposition status of each of these will be checked to see if any of them is still pending.
     * @param {ResourceFetcher} resourceFetcher - The `resourceFetcher` managing the overall fetch process. Its
     * `completionPromise` will be resolved if no pending I/O remains.
     */
    fluid.fetchResources.checkCompletion = function (resourceSpecs, resourceFetcher) {
        var incomplete = fluid.find_if(resourceSpecs, function (resourceSpec) {
            return !resourceSpec.promise.disposition;
        });
        if (!incomplete) {
            // Always defer notification in an anti-Zalgo scheme to ease problems like FLUID-6202
            fluid.invokeLater(function () {
                resourceFetcher.completionPromise.resolve(resourceSpecs);
            });
        }
    };

    /** The `options` structure fired to the transforming promise chain of the `resourceSpec`'s `event`.
     * @typedef {Object} ResourceSpecTransformOptions
     * @member {ResourceSpec} resourceSpec - The `resourceSpec` for which this chain is executing
     * @member {ResourceFetcher} resourceFetcher - The overall `resourceFetcher` governing the fetch process for the
     * complete set of loading resources
     */

    /** An impure member of the `transforming promise chain` for an individual `resourceSpec` that will stash the
     * resolved value of its predecessor (which will be the `OneResourceLoader`) into the `resourceText` member of the
     * `resourceSpec`
     * @param {String} resourceText - The resource text loaded by the previous transform chain element
     * @param {ResourceSpecTransformOptions} options - The transform chain's options structure
     * @return {String} resourceText - The unchanged value of the supplied resource text
     */
    fluid.fetchResources.noteResourceText = function (resourceText, options) {
        options.resourceSpec.resourceText = resourceText;
        return resourceText;
    };

    /** An impure member of the `transforming promise chain` for an individual `resourceSpec` that will stash the
     * resolved value of its predecessor (which will be the `ResourceParser`) into the `parser` member of the
     * `resourceSpec`
     * @param {Any} parsed - The parsed representation produced by the `ResourceParser`
     * @param {ResourceSpecTransformOptions} options - The transform chain's options structure
     * @return {Any} - The unchanged value of the parsed resource value
     */
    fluid.fetchResources.noteParsed = function (parsed, options) {
        options.resourceSpec.parsed = parsed;
        return parsed;
    };

    /** Prepare the `options` member of a `resourceSpec` by copying in the top-level element with the matching pathKey
     * TODO: Determine why on earth we still do this
     */

    fluid.fetchResources.prepareRequestOptions = function (resourceSpec) {
        var pathKey = resourceSpec.loader.pathKey;
        var requestOptions = {};
        requestOptions[pathKey] = resourceSpec[pathKey];
        resourceSpec.options = $.extend(true, {}, resourceSpec.options, requestOptions);
        return resourceSpec;
    };

    // TODO: We will have to split this up into two to allow resourceSpecs to be "rearmed" after construction.
    // The chain is reusable but the resulting promise is not.
    /** Subscribe one `resourceSpec` to the fetch process by constructing its pseudoevent `event` governing the
     * transforming promise chain, looking up its loader and parser, and adding them as listeners in this chain
     * together with other standard elements.
     * @param {ResourceSpec} resourceSpec - The `resourceSpec` to be subscribed
     * @param {String} key - The key by which the `resourceSpec` is index in its `resourceSpecs` structure
     */
    fluid.fetchResources.subscribeOneResource = function (resourceSpec, key) {
        if (resourceSpec.event) {
            fluid.fail("Cannot subscribe resource ", resourceSpec, " which has already been subscribed for I/O");
        }
        resourceSpec.event = fluid.makeEventFirer({name: "Transform chain for resource \"" + key + "\""});
        resourceSpec.event.addListener(fluid.fetchResources.noteParsed, "parsed", "last");
        var parser = fluid.resourceLoader.resolveResourceParser(resourceSpec);
        resourceSpec.event.addListener(parser, "parser", "before:parsed");
        resourceSpec.event.addListener(fluid.fetchResources.noteResourceText, "resourceText", "before:parser");
        resourceSpec.event.addListener(fluid.fetchResources.resolveLoaderTask(resourceSpec, resourceSpec.loader.loader),
            "loader", "before:resourceText");
        fluid.fetchResources.prepareRequestOptions(resourceSpec);
        resourceSpec.promise = fluid.promise();
        resourceSpec.launched = false;
    };

    /** Construct a lightweight `resourceFetcher` component (not an Infusion component) coordinating the fetch process
     * designated by a `resourceSpecs` structure.
     * @param {resourceSpecs} resourceSpecs - The resourceSpecs to be loaded. Note that this will be heavily modified
     * during the fetch process, with numerous extra fields filled in within each `resourceSpec`.
     * @param {Function} callback - An old-fashioned callback to be notified of the condition of the complete status
     * of the supplied `resourceSpecs` in either success or failure
     * @param {ResourceFetcherOptions} options - Options governing the entire fetch process (currently just a `defaultLocale`)
     * @return {ResourceFetcher} The constructed resourceFetcher, ready to have individual resources fetched by
     * an invocation of `fetchOneResource` or the entire set triggered via `fetchAll`
     */
    fluid.makeResourceFetcher = function (resourceSpecs, callback, options) {
        var that = {
            options: fluid.copy(options || {})
        };
        that.fetchAll = function () {
            return fluid.fetchResources.fetchAll(that);
        };
        that.completionPromise = fluid.promise();
        that.resourceSpecs = fluid.fetchResources.explodeForLocales(that, resourceSpecs);

        fluid.each(resourceSpecs, function (resourceSpec, key) {
            fluid.fetchResources.subscribeOneResource(resourceSpec, key);
        });

        that.completionPromise.then(callback, callback);
        return that;
    };

    /** Trigger the fetching of all resources managed by this `resourceFetcher`. This is typically triggered by the
     * `onCreate` event of an owning `ResourceLoader`, or else by a standalone invocation of `fluid.fetchResources`.
     * It will start the process of fetching all resources which have not already been set in flight by individual
     * calls to `fetchOneResource`.
     * @param {resourceFetcher} resourceFetcher - The fetcher for which all resources will be loaded
     * @return {Promise} The `completionPromise` for the fetcher which will yield the full state of fetched `resourceSpecs`
     * in either success or failure
     */
    fluid.fetchResources.fetchAll = function (resourceFetcher) {
        fluid.each(resourceFetcher.resourceSpecs, function (resourceSpec) {
            fluid.fetchResources.fetchOneResource(resourceSpec, resourceFetcher);
        });
        return resourceFetcher.completionPromise;
    };

    /** Trigger the fetching of a single `resourceSpec` from a `resourceFetcher`. This is invoked, for example,
     * by the core framework on encountering a reference out from the main component's options demanding a value
     * dependent on the asynchronously resolved `resource` value.
     * @param {resourceSpec} resourceSpec - The `resourceSpec` designating the resource which will now be fetched
     * @param {resourceFetcher} resourceFetcher - The overall `resourceFetcher` governing the fetching of all
     * resources of which the supplied `resourceSpec` must be a member
     * @return {Promise} A promise for the resolution of the resourceSpec's fetched value
     */
    fluid.fetchResources.fetchOneResource = function (resourceSpec, resourceFetcher) {
        if (!resourceSpec.launched) {
            resourceSpec.launched = true;
            var transformPromise = fluid.promise.fireTransformEvent(resourceSpec.event, null, {
                resourceSpec: resourceSpec,
                resourceFetcher: resourceFetcher
            });
            fluid.promise.follow(transformPromise, resourceSpec.promise);
            // Add these at the last possible moment so that individual resource disposition can beat them
            // TODO: Convert all these to "new firers"
            resourceSpec.promise.then(function () {
                fluid.fetchResources.checkCompletion(resourceFetcher.resourceSpecs, resourceFetcher);
            }, function (error) {
                resourceSpec.fetchError = error;
                resourceFetcher.completionPromise.reject(error);
            });
        }
        return resourceSpec.promise;
    };

    fluid.registerNamespace("fluid.resourceLoader");

    // Note: duplicate of kettle.dataSource.URL.isErrorStatus
    /** Given an HTTP status code as returned by node's `http.IncomingMessage` class (or otherwise), determine whether it corresponds to
     * an error status. This performs a simple-minded check to see if it a number outside the range [200, 300).
     * @param {Number} statusCode The HTTP status code to be tested
     * @return {Boolean} `true` if the status code represents an error status
     */
    fluid.resourceLoader.isErrorStatus = function (statusCode) {
        return statusCode < 200 || statusCode >= 300;
    };

    fluid.registerNamespace("fluid.resourceLoader.loaders");

    /** A function accepting a resourceSpec and yielding its fetched value
     * @callback OneResourceLoader
     * @param {ResourceSpec} resourceSpec - The resourceSpec to be loaded
     * @return {Promise|Any} A promise for the fetched value of the resource, or the value itself if it could be
     * loaded synchronously
     */

    /** A structure holding a resolved loader and also the `pathKey` determined to hold the structure member which
     * holds its path/url based on the duck typing inspection
     * @typedef {Object} ResolvedResourceLoader
     * @member {OneResourceLoader} loader - The loader to be used for fetching the resource
     * @member {String} pathKey - The key by which the field in the `resourceSpec` denoting the resource's path
     * can be looked up (in practice this will be "url" or "path")
     */

    /** Given a resourceSpec, look up an appropriate `OneResourceLoader` function for fetching its value based on
     * inspecting the contents of `fluid.resourceLoader.loaders` for a matching processor for the duck typing field.
     * If no loader can be located, an exception will be thrown
     * @param {ResourceSpec} resourceSpec - The resourceSpec for which the loader is to be looked up
     * @return {ResolvedResourceLoader} A structure holding both the loader and also the key for the corresponding
     * duck typing field
     */
    fluid.resourceLoader.resolveResourceLoader = function (resourceSpec) {
        var loader = fluid.find(fluid.resourceLoader.loaders, function (loader, key) {
            if (resourceSpec[key]) {
                return {
                    loader: loader,
                    pathKey: key
                };
            }
        });
        if (!loader) {
            fluid.fail("Couldn't locate resource loader for resource spec ", resourceSpec,
                "; it should have had one of the fields ", Object.keys(fluid.resourceLoader.loaders) + " filled out");
        }
        return loader;
    };

    /** A no-op `OneResourceLoader` which simply returns a pre-specified `resourceText`. Useful in the case the
     * real I/O has been done elsewhere and its results are simply to be relayed to another loader.
     * @param {ResourceSpec} resourceSpec - The `ResourceSpec` for which the `resourceText` field has already been filled in
     * @return {String} The `resourceSpec`'s `resourceText` member
     */
    fluid.resourceLoader.loaders.resourceText = function (resourceSpec) {
        return resourceSpec.resourceText;
    };

    /** A generalised 'promise' `OneResourceLoader` that allows some arbitrary asynchronous process to be
     * interpolated into the loader. It returns the value of the field `promise` which is intended to yield
     * the successful or unsuccessful resource value
     * @param {ResourceSpec} resourceSpec - A `ResourceSpec` for which the `promise` field has already been filled in to hold
     * a promise
     * @return {Promise} The resourceSpec's `promise` field
     */
    fluid.resourceLoader.loaders.promise = function (resourceSpec) {
        return resourceSpec.promise;
    };

    /** A `OneResourceLoader` which queries the `get` method of a DataSource in order to enact the required I/O
     * @param {ResourceSpec} resourceSpec - A `ResourceSpec` for which the `dataSource` field has already been filled in to hold
     * a reference to a `dataSource`, and perhaps also its `directModel` field.
     * @return {Promise} The resourceSpec's `promise` field
     */
    fluid.resourceLoader.loaders.promise = function (resourceSpec) {
        return resourceSpec.dataSource.get(resourceSpec.directModel, resourceSpec.options);
    };

    fluid.registerNamespace("fluid.resourceLoader.parsers");

    /** A function accepting a fetched resource and parsing it into a more structured form. Given such a parser is
     * executed in an asynchronous chain, it should report failures as promise rejections rather than thrown exceptions.
     * @callback ResourceParser
     * @param {String} resourceText - The fetched value of the resource as a String
     * @return {Promise|Any} A parsed form of the resource
     */

    /** Looks up a suitable parser based on an inspection of the contents of `fluid.resourceLoader.parsers` for an
     * implementation matching the `dataType` field in the supplied `resourceSpec`. If there is no such field or
     * the lookup fails, returns `fluid.identity`
     * @param {ResourceSpec} resourceSpec - The resourceSpec for which a parser is to be looked up
     * @return {ResourceParser} An appropriate parser for the resource's dataType, or `fluid.identity` if no such
     * parser is appropriate
     */
    fluid.resourceLoader.resolveResourceParser = function (resourceSpec) {
        return fluid.resourceLoader.parsers[resourceSpec.dataType] || fluid.identity;
    };

    /** Parses a fetched resource text as JSON
     * @param {String} resourceText - The text to be parsed
     * @return {Promise} A promise yielding the `resourceText` parsed as JSON, or else a rejection holding a readable
     * description of the location of the parse failure
     */
    fluid.resourceLoader.parsers.json = function (resourceText) {
        return fluid.dataSource.parseJSON(resourceText);
    };


    /*** The top-level grade fluid.resourceLoader itself ***/

    /**
     * A configurable component to allow users to load multiple resources by issuance of I/O.
     * The resources can be localised by means of options `locale`, `defaultLocale`. Once all
     * resources are loaded, the event `onResourcesLoaded` will be fired, which can be used
     * to time the creation of components dependent on the resources. In addition, any resources
     * requested during the construction of a component can be used to delay its construction until
     * they are consumed by some component workflow.
     */

    fluid.defaults("fluid.resourceLoader", {
        gradeNames: ["fluid.component"],
        listeners: {
            "onCreate.loadResources": "fluid.resourceLoader.loadResources"
        },
        members: {
            resourceFetcher: {
                expander: {
                    funcName: "fluid.resourceLoader.makeResourceFetcher",
                    args: ["{that}", "{that}.options.resourceOptions", "{that}.resolveResources"]
                }
            }
        },
        // defaultLocale: "en", // May be supplied by integrators
        // locale: "en", // May be supplied by integrators
        terms: {},  // May be supplied by integrators
        resourceOptions: {},
        resources: {},  // Must be supplied by integrators
        invokers: {
            transformURL: {
                funcName: "fluid.stringTemplate",
                args: ["{arguments}.0", "{that}.options.terms"]
            },
            resolveResources: {
                funcName: "fluid.resourceLoader.resolveResources",
                args: ["{that}.options.resources", "{that}.options.locale", "{that}.options.defaultLocale",
                    "{that}.options.resourceOptions", "{that}.transformURL"]
            }
        },
        events: {
            onResourcesLoaded: null
        }
    });

    /** Constructs a `fluid.resourceLoader' component's own `resourceFetcher` machine. Given that component options
     * are immutable, it takes a copy of the supplied `resourceSpecs` option (taken from the `resources` top-level
     * component option) before passing them to the fetcher which would otherwise corrupt them
     * @param {fluid.resourceLoader} that - The resourceLoader component for which the fetcher is to be constructed (
     * (currently used to target the delivery of the delivered `that.resources` members)
     * @param {ResourceFetcherOptions} resourceOptions - Options governing the entire resource fetcher (currently
     * just `defaultLocale`)
     * @param {Function} resolveResources - A function yielding a `resourceSpecs` structure ready for use. By default this has interpolated
     * URLs within the specification.
     * @return {ResourceFetcher} The ResourceFetcher ready to be attached to the ResourceLoader's top level
     */
    fluid.resourceLoader.makeResourceFetcher = function (that, resourceOptions, resolveResources) {
        var resolved = resolveResources();
        var fetcher = fluid.makeResourceFetcher(fluid.copy(resolved), null, resourceOptions);
        // Note that we beat the existing completion listener in the fetcher by "sheer luck"
        fluid.each(fetcher.resourceSpecs, function (resourceSpec, key) {
            resourceSpec.promise.then(function () {
                that.resources[key] = resourceSpec;
            });
        });
        return fetcher;
    };

    // TODO: This function needs to be eliminated and transformURL moved into the body of makeResourceFetcher next
    // to explodeForLocales, where it can make use of the `pathKey`. Then we can move the obstrusive `terms` definition
    // out of top level. Unfortunately it is used explicitly within the fluid.prefs.separatedPanel.lazyLoad
    // which we need to unpick since its workflow can now probably be substantially simplified.
    fluid.resourceLoader.resolveResources = function (resources, locale, defaultLocale, resourceOptions, transformURL) {
        return fluid.transform(resources, function (record) {
            var userSpec = typeof(record) === "string" ? {url: record} : record;
            var resourceSpec = $.extend(true, {}, resourceOptions, {
                defaultLocale: defaultLocale,
                locale: locale}, userSpec);
            resourceSpec.url = transformURL(resourceSpec.url);
            return resourceSpec;
        });
    };

    /** On construction of the resourceLoader, kick off the process of fetching all the resources configured within
     * its resourceFetcher. Note that some or all of these resources may already have been fetched by demands occuring
     * during component startup (e.g. as initial model values or renderer templates), and so the `onResourcesLoaded`
     * event may fire immediately
     * @param {fluid.resourceLoader} that - The loader for which the I/O fetch process is to be started
     */
    fluid.resourceLoader.loadResources = function (that) {
        var completionPromise = that.resourceFetcher.fetchAll();
        completionPromise.then(function () {
            that.events.onResourcesLoaded.fire(that.resources);
        }, function (error) {
            // Note that if the failure was for a resource demanded during startup, this component will already have
            // been destroyed
            fluid.log("Failure loading resources for component at path " + fluid.dumpComponentPath(that) + ": ", error);
        });
    };

})(jQuery, fluid_3_0_0);
