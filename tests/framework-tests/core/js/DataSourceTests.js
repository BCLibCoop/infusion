/*
Copyright The Infusion copyright holders
See the AUTHORS.md file at the top-level directory of this distribution and at
https://github.com/fluid-project/infusion/raw/main/AUTHORS.md.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/main/Infusion-LICENSE.txt
*/

/* global sinon, jqUnit */

(function () {
    "use strict";

    fluid.registerNamespace("fluid.tests.dataSource");

    fluid.tests.dataSource.testData = {
        error: {
            message: "Error"
        },
        plain: {
            lowerCase: "hello world",
            upperCase: "HELLO WORLD"
        },
        json: {
            serialized: "{\"value\":\"test\"}",
            object: {"value": "test"},
            transformed: {"remoteValue": "test"}
        }
    };

    fluid.defaults("fluid.tests.dataSource.plainText", {
        gradeNames: ["fluid.dataSource"],
        writableGrade: "fluid.tests.dataSource.plainText.writable",
        components: {
            encoding: {
                type: "fluid.dataSource.encoding.none"
            }
        },
        listeners: {
            "onRead.impl": {
                func: "fluid.tests.dataSource.getInitialPayload"
            }
        }
    });

    fluid.defaults("fluid.tests.dataSource.plainText.transformed", {
        gradeNames: ["fluid.tests.dataSource.plainText"],
        writableGrade: "fluid.tests.dataSource.plainText.writableTransformed",
        listeners: {
            "onRead.transform": {
                func: "fluid.tests.dataSource.plainText.toUpperCase",
                priority: "after:encoding"
            }
        }
    });

    fluid.defaults("fluid.tests.dataSource.plainText.writable", {
        gradeNames: ["fluid.dataSource.writable"],
        listeners: {
            "onWrite.impl": {
                func: "fluid.tests.dataSource.write"
            }
        }
    });

    fluid.defaults("fluid.tests.dataSource.plainText.writableTransformed", {
        gradeNames: ["fluid.tests.dataSource.plainText.writable"],
        listeners: {
            "onWrite.transform": {
                func: "fluid.tests.dataSource.plainText.toLowerCase",
                priority: "before:encoding"
            }
        }
    });

    fluid.tests.dataSource.getInitialPayload = function (payload, options) {
        var promise = fluid.promise();
        var toFail = fluid.get(options, ["directModel", "toFail"]);
        var dataPath = fluid.get(options, ["directModel", "path"]);
        if (toFail) {
            promise.reject(fluid.tests.dataSource.testData.error);
        } else {
            promise.resolve(fluid.get(fluid.tests.dataSource.testData, dataPath));
        }
        return promise;
    };

    fluid.tests.dataSource.write = function (payload, options) {
        var promise = fluid.promise();
        var toFail = fluid.get(options, ["directModel", "toFail"]);
        if (toFail) {
            promise.reject(fluid.tests.dataSource.testData.error);
        } else {
            promise.resolve(payload);
        }
        return promise;
    };

    fluid.tests.dataSource.plainText.toUpperCase = function (payload) {
        return payload.toUpperCase();
    };

    fluid.tests.dataSource.plainText.toLowerCase = function (payload) {
        return payload.toLowerCase();
    };

    fluid.tests.dataSource.toValue = function (model) {
        return {"value": model.remoteValue};
    };

    fluid.tests.dataSource.toRemoteValue = function (model) {
        return {"remoteValue": model.value};
    };

    fluid.defaults("fluid.tests.dataSource.plainText.tests", {
        gradeNames: ["fluid.test.testEnvironment"],
        components: {
            dsRead: {
                type: "fluid.tests.dataSource.plainText"
            },
            dsReadTransformed: {
                type: "fluid.tests.dataSource.plainText.transformed"
            },
            dsReadWrite: {
                type: "fluid.tests.dataSource.plainText",
                options: {
                    writable: true
                }
            },
            dsReadWriteTransformed: {
                type: "fluid.tests.dataSource.plainText.transformed",
                options: {
                    writable: true
                }
            },
            dataSourceTester: {
                type: "fluid.tests.dataSource.plainText.tester"
            }
        }
    });

    fluid.defaults("fluid.tests.dataSource.plainText.tester", {
        gradeNames: ["fluid.test.testCaseHolder"],
        modules: [{
            name: "DataSource with text/plain encoding",
            tests: [{
                expect: 2,
                name: "Get plain text",
                sequence: [{
                    task: "{dsRead}.get",
                    args: [{"path": ["plain", "lowerCase"]}],
                    resolve: "jqUnit.assertEquals",
                    resolveArgs: ["The plain text should be returned", fluid.tests.dataSource.testData.plain.lowerCase, "{arguments}.0"]
                }, {
                    task: "{dsRead}.get",
                    args: [{"toFail": true, "path": ["plain", "lowerCase"]}],
                    reject: "jqUnit.assertDeepEq",
                    rejectArgs: ["An error object should be returned", fluid.tests.dataSource.testData.error, "{arguments}.0"]
                }]
            }, {
                expect: 2,
                name: "Get plain text with transformation",
                sequence: [{
                    task: "{dsReadTransformed}.get",
                    args: [{"path": ["plain", "lowerCase"]}],
                    resolve: "jqUnit.assertEquals",
                    resolveArgs: ["The plain text should be returned", fluid.tests.dataSource.testData.plain.upperCase, "{arguments}.0"]
                }, {
                    task: "{dsReadTransformed}.get",
                    args: [{"toFail": true, "path": ["plain", "lowerCase"]}],
                    reject: "jqUnit.assertDeepEq",
                    rejectArgs: ["An error object should be returned", fluid.tests.dataSource.testData.error, "{arguments}.0"]
                }]
            }, {
                expect: 2,
                name: "Write plain text",
                sequence: [{
                    task: "{dsReadWrite}.set",
                    args: [{}, fluid.tests.dataSource.testData.plain.upperCase],
                    resolve: "jqUnit.assertEquals",
                    resolveArgs: ["The plain text should be returned", fluid.tests.dataSource.testData.plain.upperCase, "{arguments}.0"]
                }, {
                    task: "{dsReadWrite}.set",
                    args: [{"toFail": true}, fluid.tests.dataSource.testData.plain.upperCase],
                    reject: "jqUnit.assertDeepEq",
                    rejectArgs: ["An error object should be returned", fluid.tests.dataSource.testData.error, "{arguments}.0"]
                }]
            }, {
                expect: 2,
                name: "Write plain text with transformation",
                sequence: [{
                    task: "{dsReadWriteTransformed}.set",
                    args: [{}, fluid.tests.dataSource.testData.plain.upperCase],
                    resolve: "jqUnit.assertEquals",
                    resolveArgs: ["The plain text should be returned", fluid.tests.dataSource.testData.plain.lowerCase, "{arguments}.0"]
                }, {
                    task: "{dsReadWriteTransformed}.set",
                    args: [{"toFail": true}, fluid.tests.dataSource.testData.plain.upperCase],
                    reject: "jqUnit.assertDeepEq",
                    rejectArgs: ["An error object should be returned", fluid.tests.dataSource.testData.error, "{arguments}.0"]
                }]
            }]
        }]
    });

    fluid.defaults("fluid.tests.dataSource.json", {
        gradeNames: ["fluid.dataSource"],
        listeners: {
            "onRead.impl": {
                func: "fluid.tests.dataSource.getInitialPayload"
            }
        }
    });

    fluid.defaults("fluid.tests.dataSource.json.transformed", {
        gradeNames: ["fluid.tests.dataSource.json"],
        listeners: {
            "onRead.transform": {
                func: "fluid.tests.dataSource.toRemoteValue",
                priority: "after:encoding"
            }
        }
    });

    fluid.defaults("fluid.tests.dataSource.json.writable", {
        listeners: {
            "onWrite.impl": {
                func: "fluid.tests.dataSource.write"
            }
        }
    });

    fluid.defaults("fluid.tests.dataSource.json.writableTransformed", {
        gradeNames: ["fluid.tests.dataSource.json.writable"],
        listeners: {
            "onWrite.transform": {
                func: "fluid.tests.dataSource.toValue",
                priority: "before:encoding"
            }
        }
    });

    fluid.makeGradeLinkage("fluid.tests.dataSource.linkage.json", ["fluid.dataSource.writable", "fluid.tests.dataSource.json"], "fluid.tests.dataSource.json.writable");
    fluid.makeGradeLinkage("fluid.tests.dataSource.linkage.json.transformed", ["fluid.dataSource.writable", "fluid.tests.dataSource.json.transformed"], "fluid.tests.dataSource.json.writableTransformed");

    fluid.defaults("fluid.tests.dataSource.json.tests", {
        gradeNames: ["fluid.test.testEnvironment"],
        components: {
            dsRead: {
                type: "fluid.tests.dataSource.json"
            },
            dsReadTransformed: {
                type: "fluid.tests.dataSource.json.transformed"
            },
            dsReadWrite: {
                type: "fluid.tests.dataSource.json",
                options: {
                    gradeNames: ["fluid.dataSource.writable"]
                }
            },
            dsReadWriteTransformed: {
                type: "fluid.tests.dataSource.json.transformed",
                options: {
                    gradeNames: ["fluid.dataSource.writable"]
                }
            },
            dataSourceTester: {
                type: "fluid.tests.dataSource.json.tester"
            }
        }
    });

    fluid.defaults("fluid.tests.dataSource.json.tester", {
        gradeNames: ["fluid.test.testCaseHolder"],
        modules: [{
            name: "DataSource with JSON encoding",
            tests: [{
                expect: 2,
                name: "Get JSON",
                sequence: [{
                    task: "{dsRead}.get",
                    args: [{"path": ["json", "serialized"]}],
                    resolve: "jqUnit.assertDeepEq",
                    resolveArgs: ["A JSON object should be returned", fluid.tests.dataSource.testData.json.object, "{arguments}.0"]
                }, {
                    task: "{dsRead}.get",
                    args: [{"toFail": true, "path": ["json", "serialized"]}],
                    reject: "jqUnit.assertDeepEq",
                    rejectArgs: ["An error object should be returned", fluid.tests.dataSource.testData.error, "{arguments}.0"]
                }]
            }, {
                expect: 2,
                name: "Get JSON with transformation",
                sequence: [{
                    task: "{dsReadTransformed}.get",
                    args: [{"path": ["json", "serialized"]}],
                    resolve: "jqUnit.assertDeepEq",
                    resolveArgs: ["A JSON object, with transformations applied, should be returned", fluid.tests.dataSource.testData.json.transformed, "{arguments}.0"]
                }, {
                    task: "{dsReadTransformed}.get",
                    args: [{"toFail": true, "path": ["json", "serialized"]}],
                    reject: "jqUnit.assertDeepEq",
                    rejectArgs: ["An error object should be returned", fluid.tests.dataSource.testData.error, "{arguments}.0"]
                }]
            }, {
                expect: 2,
                name: "Write JSON",
                sequence: [{
                    task: "{dsReadWrite}.set",
                    args: [{}, fluid.tests.dataSource.testData.json.object],
                    resolve: "jqUnit.assertDeepEq",
                    resolveArgs: ["A JSON object should be returned", fluid.tests.dataSource.testData.json.object, "{arguments}.0"]
                }, {
                    task: "{dsReadWrite}.set",
                    args: [{"toFail": true}, fluid.tests.dataSource.testData.json.object],
                    reject: "jqUnit.assertDeepEq",
                    rejectArgs: ["An error object should be returned", fluid.tests.dataSource.testData.error, "{arguments}.0"]
                }]
            }, {
                expect: 2,
                name: "Write JSON with transformation",
                sequence: [{
                    task: "{dsReadWriteTransformed}.set",
                    args: [{}, fluid.tests.dataSource.testData.json.transformed],
                    resolve: "jqUnit.assertDeepEq",
                    resolveArgs: ["A JSON object, with transformations applied, should be returned", fluid.tests.dataSource.testData.json.object, "{arguments}.0"]
                }, {
                    task: "{dsReadWriteTransformed}.set",
                    args: [{"toFail": true}, fluid.tests.dataSource.testData.json.transformed],
                    reject: "jqUnit.assertDeepEq",
                    rejectArgs: ["An error object should be returned", fluid.tests.dataSource.testData.error, "{arguments}.0"]
                }]
            }]
        }]
    });

    fluid.defaults("fluid.tests.sinonServer", {
        gradeNames: "fluid.component",
        members: {
            sinonServer: "@expand:fluid.tests.createSinonServer({that}, {that}.options.respondWith, {that}.options.sinonOptions)"
        },
        respondWith: { // Hash of key to {response, [method], [url]}
        },
        sinonOptions: {
            autoRespond: true
        },
        listeners: {
            "onDestroy.restore": "fluid.tests.restoreSinon"
        }
    });

    fluid.tests.restoreSinon = function (that) {
        if (that.sinonServer.restore) {
            that.sinonServer.restore();
        }
    };

    fluid.tests.createSinonServer = function (that, respondWith, sinonOptions) {
        var server = sinon.createFakeServer(sinonOptions);
        fluid.each(respondWith, function (oneWith) {
            var response;
            if (oneWith.response.func || oneWith.response.funcName) {
                response = fluid.makeInvoker(that, fluid.filterKeys(oneWith.response, ["func", "funcName", "args"]), "sinonServer responder");
            } else {
                var statusCode = oneWith.response.statusCode || 200;
                var headers = oneWith.response.headers || { "Content-Type": "application/json" };
                var json = headers["Content-Type"] === "application/json";
                var payload = (json ? JSON.stringify : fluid.identity)(oneWith.response.payload);
                response = [statusCode, headers, payload];
            }
            if (oneWith.url) {
                if (oneWith.method) {
                    server.respondWith(oneWith.method, oneWith.url, response);
                } else {
                    server.respondWith(oneWith.url, response);
                }
            } else {
                server.respondWith(response);
            }
        });
        return server;
    };

    fluid.defaults("fluid.tests.dataSource.URL.json.tests", {
        gradeNames: ["fluid.test.testEnvironment"],
        components: {
            sinonServer: {
                type: "fluid.tests.sinonServer",
                options: {
                    respondWith: {
                        initModel: {
                            method: "GET",
                            url: "/initModel.json",
                            response: {
                                payload: fluid.tests.dataSource.testData.json.object
                            }
                        }
                    }
                }
            },
            dsRead: {
                type: "fluid.dataSource.URL",
                options: {
                    url: "/initModel.json"
                }
            },
            dataSourceTester: {
                type: "fluid.tests.dataSource.URL.json.tester"
            }
        }
    });

    fluid.defaults("fluid.tests.dataSource.URL.json.tester", {
        gradeNames: ["fluid.test.testCaseHolder"],
        modules: [{
            name: "URL DataSource with JSON encoding",
            tests: [{
                expect: 1,
                name: "Get JSON",
                sequence: [{
                    task: "{dsRead}.get",
                    resolve: "jqUnit.assertDeepEq",
                    resolveArgs: ["Expected object should be returned", fluid.tests.dataSource.testData.json.object, "{arguments}.0"]
                }]
            }]
        }]
    });

    // FLUID-6597: Check that we can relay headers encoded in static options

    fluid.defaults("fluid.tests.dataSource.URL.headers.tests", {
        gradeNames: ["fluid.test.testEnvironment"],
        components: {
            sinonServer: {
                type: "fluid.tests.sinonServer",
                options: {
                    respondWith: {
                        initModel: {
                            method: "GET",
                            url: "/",
                            response: {
                                funcName: "fluid.tests.dataSource.URL.headers.checkHeaders"
                            }
                        }
                    }
                }
            },
            dsRead: {
                type: "fluid.dataSource.URL",
                options: {
                    url: "/",
                    headers: {
                        "Content-Type": "text/html;charset=utf-8"
                    },
                    components: {
                        encoding: {
                            type: "fluid.dataSource.encoding.none"
                        }
                    }
                }
            },
            dataSourceTester: {
                type: "fluid.tests.dataSource.URL.headers.tester"
            }
        }
    });

    fluid.tests.dataSource.URL.headers.checkHeaders = function (xhr) {
        jqUnit.assertEquals("Expected request header sent", "text/html;charset=utf-8", xhr.requestHeaders["Content-Type"]);
        xhr.respond(200, { "Content-Type": "text/html;charset=utf-8" }, "<html></html>");
    };

    fluid.defaults("fluid.tests.dataSource.URL.headers.tester", {
        gradeNames: ["fluid.test.testCaseHolder"],
        modules: [{
            name: "URL DataSource with HTML content type and header",
            tests: [{
                expect: 2,
                name: "Get HTML",
                sequence: [{
                    task: "{dsRead}.get",
                    resolve: "jqUnit.assertDeepEq",
                    resolveArgs: ["Expected markup should be returned", "<html></html>", "{arguments}.0"]
                }]
            }]
        }]
    });

    // FLUID-6599: Check that we don't default port unnecessarily

    fluid.defaults("fluid.tests.dataSource.URL.port.tests", {
        gradeNames: ["fluid.test.testEnvironment"],
        url: null, // Filled in by client
        name: null,
        components: {
            sinonServer: {
                type: "fluid.tests.sinonServer",
                options: {
                    invokers: {
                        respond: {
                            funcName: "fluid.tests.dataSource.URL.port.checkPort",
                            args: ["{arguments}.0", "{testEnvironment}.options.url"]
                        }
                    },
                    respondWith: {
                        initModel: {
                            method: "GET",
                            url: "{testEnvironment}.options.url",
                            response: {
                                func: "{that}.respond"
                            }
                        }
                    }
                }
            },
            dsRead: {
                type: "fluid.dataSource.URL",
                options: {
                    url: "{testEnvironment}.options.url"
                }
            },
            dataSourceTester: {
                type: "fluid.tests.dataSource.URL.port.tester"
            }
        }
    });

    fluid.tests.dataSource.URL.port.checkPort = function (xhr, baseURL) {
        var url = new URL(xhr.url);
        var base = new URL(baseURL, window.location);
        jqUnit.assertEquals("Expected port of \"" + base.port + "\" set", base.port, url.port);
        xhr.respond(200, { "Content-Type": "application/json" }, "{}");
    };

    fluid.defaults("fluid.tests.dataSource.URL.port.tester", {
        gradeNames: ["fluid.test.testCaseHolder"],
        modules: [{
            name: "{testEnvironment}.options.name",
            tests: [{
                expect: 2,
                name: "Get JSON",
                sequence: [{
                    task: "{dsRead}.get",
                    resolve: "jqUnit.assertDeepEq",
                    resolveArgs: ["Expected value should be returned", {}, "{arguments}.0"]
                }]
            }]
        }]
    });

    fluid.defaults("fluid.tests.dataSource.URL.port.httpsBlank.tests", {
        gradeNames: "fluid.tests.dataSource.URL.port.tests",
        url: "https://example.com",
        name: "https URL without port"
    });

    fluid.defaults("fluid.tests.dataSource.URL.port.relative.tests", {
        gradeNames: "fluid.tests.dataSource.URL.port.tests",
        url: "/login",
        name: "Relative URL"
    });

    fluid.defaults("fluid.tests.dataSource.URL.port.explicit.tests", {
        gradeNames: "fluid.tests.dataSource.URL.port.tests",
        url: "https://example.com:444",
        name: "https URL with explicit port"
    });

    fluid.test.runTests([
        "fluid.tests.dataSource.URL.port.httpsBlank.tests",
        "fluid.tests.dataSource.URL.port.relative.tests",
        "fluid.tests.dataSource.URL.port.explicit.tests",
        "fluid.tests.dataSource.URL.headers.tests",
        "fluid.tests.dataSource.URL.json.tests",
        "fluid.tests.dataSource.plainText.tests",
        "fluid.tests.dataSource.json.tests"
    ]);

})();
