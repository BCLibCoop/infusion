/*
Copyright 2018 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
 */

/* global fluid, jqUnit */

(function ($) {
    "use strict";

    $(document).ready(function () {

        fluid.registerNamespace("fluid.tests.textNodeParser");

        /****************************************************************
         * fluid.textNodeParser.isWord Tests
         ****************************************************************/

        fluid.tests.textNodeParser.isWordTestCases = {
            "trueCase": ["a", "hello", "test string"],
            "falseCase": ["", " ", "\t", "\n", undefined, null]
        };

        jqUnit.test("Test fluid.textNodeParser.isWord", function () {
            // test trueCase
            fluid.each(fluid.tests.textNodeParser.isWordTestCases.trueCase, function (str) {
                jqUnit.assertTrue("\"" + str + "\" is considered a word.", fluid.textNodeParser.isWord(str));
            });

            // test falseCase
            fluid.each(fluid.tests.textNodeParser.isWordTestCases.falseCase, function (str) {
                jqUnit.assertFalse("\"" + str + "\" is not considered a word.", fluid.textNodeParser.isWord(str));
            });
        });

        /****************************************************************
         * fluid.textNodeParser.hasTextToRead Tests
         ****************************************************************/

        fluid.tests.textNodeParser.assertTextToRead = function (textToReadFn, testCases) {
            // The innerText method called in fluid.textNodeParser.hasTextToRead returns text from some hidden elements
            // that modern browsers do not.
            if ($.browser.msie) {
                jqUnit.assert("Tests were not run because innerText works differently on IE 11 and is used for a feature not supported in IE");
            } else {
                // test trueCase
                fluid.each(testCases.trueCase, function (selector) {
                    jqUnit.assertTrue("\"" + selector + "\" should have text to read.", textToReadFn($(selector)));
                });

                // test falseCase
                fluid.each(testCases.falseCase, function (selector) {
                    jqUnit.assertFalse("\"" + selector + "\" shouldn't have text to read.", textToReadFn($(selector)));
                });
            }
        };

        fluid.tests.textNodeParser.hasTextToReadTestCases = {
            "trueCase": [
                ".flc-textNodeParser-test-checkDOMText"
            ],
            "falseCase": [
                ".flc-textNodeParser-test-checkDOMText-noNode",
                ".flc-textNodeParser-test-checkDOMText-empty",
                ".flc-textNodeParser-test-checkDOMText-script",
                ".flc-textNodeParser-test-checkDOMText-nestedScript"
            ]
        };

        jqUnit.test("Test fluid.textNodeParser.hasTextToRead", function () {
            fluid.tests.textNodeParser.assertTextToRead(fluid.textNodeParser.hasTextToRead, fluid.tests.textNodeParser.hasTextToReadTestCases);
        });

        /****************************************************************
         * fluid.textNodeParser.hasTextToRead Tests
         ****************************************************************/

        fluid.tests.textNodeParser.hasVisibleTextToReadTestCases = {
            "trueCase": [
                ".flc-textNodeParser-test-checkDOMText",
                ".flc-textNodeParser-test-checkDOMText-ariaHiddenFalse",
                ".flc-textNodeParser-test-checkDOMText-ariaHiddenFalse-nested",
                ".flc-textNodeParser-test-checkDOMText-hiddenA11y",
                ".flc-textNodeParser-test-checkDOMText-hiddenA11y-nested",
                ".flc-textNodeParser-test-checkDOMText-visible"
            ],
            "falseCase": [
                ".flc-textNodeParser-test-checkDOMText-noNode",
                ".flc-textNodeParser-test-checkDOMText-none",
                ".flc-textNodeParser-test-checkDOMText-none-nested",
                ".flc-textNodeParser-test-checkDOMText-visHidden",
                ".flc-textNodeParser-test-checkDOMText-visHidden-nested",
                ".flc-textNodeParser-test-checkDOMText-hidden",
                ".flc-textNodeParser-test-checkDOMText-hidden-nested",
                ".flc-textNodeParser-test-checkDOMText-ariaHiddenTrue",
                ".flc-textNodeParser-test-checkDOMText-ariaHiddenTrue-nested",
                ".flc-textNodeParser-test-checkDOMText-nestedNone",
                ".flc-textNodeParser-test-checkDOMText-empty",
                ".flc-textNodeParser-test-checkDOMText-script",
                ".flc-textNodeParser-test-checkDOMText-nestedScript"
            ]
        };

        jqUnit.test("Test fluid.textNodeParser.hasVisibleText", function () {
            fluid.tests.textNodeParser.assertTextToRead(fluid.textNodeParser.hasVisibleText, fluid.tests.textNodeParser.hasTextToReadTestCases);
        });

        /****************************************************************
         * fluid.textNodeParser.getLang Tests
         ****************************************************************/

        fluid.tests.textNodeParser.getLangTestCases = [{
            selector: ".flc-textNodeParser-test-lang-none",
            lang: undefined
        }, {
            selector: ".flc-textNodeParser-test-lang-self",
            lang: "en-US"
        }, {
            selector: ".flc-textNodeParser-test-lang-parent",
            lang: "en-CA"
        }];

        jqUnit.test("Test fluid.textNodeParser.getLang", function () {
            fluid.each(fluid.tests.textNodeParser.getLangTestCases, function (testCase) {
                var result = fluid.textNodeParser.getLang(testCase.selector);
                jqUnit.assertEquals("The correct language code should be found for selector " + testCase.selector, testCase.lang, result);
            });
        });
        /****************************************************************
         * fluid.textNodeParser Tests
         ****************************************************************/

        fluid.tests.textNodeParser.parsed = [{
            lang: "en-CA",
            text: "",
            childIndex: 0
        }, {
            lang: "en-CA",
            text: "Text to test. Including",
            childIndex: 0
        }, {
            lang: "en",
            text: "nested",
            childIndex: 0
        }, {
            lang: "en",
            text: "text",
            childIndex: 0
        }, {
            lang: "en",
            text: "nodes",
            childIndex: 2
        }, {
            lang: "en",
            text: "to verify proper parsing.",
            childIndex: 0
        }];

        fluid.defaults("fluid.tests.textNodeParser", {
            gradeNames: ["fluid.textNodeParser"],
            members: {
                record: []
            },
            listeners: {
                "onParsedTextNode.record": {
                    listener: "fluid.tests.textNodeParser.record",
                    args: ["{that}.record", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
                }
            }
        });

        fluid.tests.textNodeParser.record = function (record, childNode, lang, childIndex) {
            record.push({
                text: childNode.textContent.trim(),
                lang: lang,
                childIndex: childIndex
            });
        };

        jqUnit.test("Test fluid.textNodeParser", function () {
            jqUnit.expect(1);
            var that = fluid.tests.textNodeParser({
                listeners: {
                    "afterParse.test": {
                        listener: function (that) {
                            jqUnit.assertDeepEq("The DOM structure should have been parsed correctly.", fluid.tests.textNodeParser.parsed, that.record);
                        },
                        args: ["{that}"]
                    }
                }
            });
            that.parse($(".flc-textNodeParser-test"));
        });

    });
})(jQuery);
