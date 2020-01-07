/*
Copyright The Infusion copyright holders
See the AUTHORS.md file at the top-level directory of this distribution and at
https://github.com/fluid-project/infusion/raw/master/AUTHORS.md.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

var fluid_3_0_0 = fluid_3_0_0 || {};


(function ($, fluid) {
    "use strict";

    fluid.registerNamespace("fluid.prefs.builder");

    fluid.deferredMergePolicy = function (target, source) {
        if (!target) {
            target = new fluid.mergingArray();
        }
        if (source instanceof fluid.mergingArray) {
            target.push.apply(target, source);
        } else if (source !== undefined) {
            target.push(source);
        }

        return target;
    };

    fluid.defaults("fluid.prefs.builder", {
        gradeNames: [
            "fluid.prefs.primaryBuilder",
            "fluid.prefs.auxBuilder",
            "{that}.applyAssemblerGrades"
        ],
        mergePolicy: {
            preferences: "replace",
            prefsPrioritized: {
                noexpand: true,
                func: fluid.deferredMergePolicy
            }
        },
        invokers: {
            applyAssemblerGrades: {
                funcName: "fluid.prefs.builder.getAssemblerGrades",
                args: ["{that}.options.assemblerGrades", "{that}.options.buildType"]
            }
        },
        buildType: "prefsEditor",
        assemblerGrades: {
            store: "fluid.prefs.assembler.store",
            prefsEditor: "fluid.prefs.assembler.prefsEd",
            enhancer: "fluid.prefs.assembler.uie"
        },
        requestedPrefs: {
            expander: {
                funcName: "fluid.keys",
                args: ["{that}.options.prefsMerged"]
            }
        },
        prefsMerged: {
            expander: {
                funcName: "fluid.prefs.builder.mergePrefs",
                args: ["{that}", "{that}.options.prefsPrioritized"]
            }
        },
        prefsPrioritized: {
            expander: {
                funcName: "fluid.prefs.builder.prioritizePrefs",
                args: ["{that}.options.preferences"]
            }
        },
        componentGrades: {
            expander: {
                func: "fluid.prefs.builder.constructGrades",
                args: [
                    "{that}.options.auxSchema",
                    [
                        "enactors",
                        "messages",
                        "panels",
                        "initialModel",
                        "templateLoader",
                        "messageLoader",
                        "terms",
                        "aliases_prefsEditor",
                        "aliases_enhancer"
                    ]
                ]
            }
        }
    });

    fluid.prefs.builder.getAssemblerGrades = function (assemblers, buildType) {
        return assemblers[buildType];
    };

    fluid.defaults("fluid.prefs.assembler.store", {
        gradeNames: ["fluid.component"],
        components: {
            store: {
                type: "fluid.prefs.globalSettingsStore",
                options: {
                    distributeOptions: {
                        "uie.store.context.checkUser": {
                            target: "{that fluid.prefs.store}.options.contextAwareness.strategy.checks.user",
                            record: {
                                contextValue: "{fluid.prefs.assembler.store}.options.storeType",
                                gradeNames: "{fluid.prefs.assembler.store}.options.storeType"
                            }
                        }
                    }
                }
            }
        },
        distributeOptions: {
            "uie.store": {
                source: "{that}.options.store",
                target: "{that fluid.prefs.store}.options"
            }
        }
    });

    fluid.defaults("fluid.prefs.assembler.uie", {
        gradeNames: ["fluid.prefs.assembler.store", "fluid.viewComponent"],
        enhancerType: "fluid.pageEnhancer",
        components: {
            store: {
                type: "fluid.prefs.globalSettingsStore",
                options: {
                    distributeOptions: {
                        "uie.store.context.checkUser": {
                            target: "{that fluid.prefs.store}.options.contextAwareness.strategy.checks.user",
                            record: {
                                contextValue: "{fluid.prefs.assembler.store}.options.storeType",
                                gradeNames: "{fluid.prefs.assembler.store}.options.storeType"
                            }
                        }
                    }
                }
            },
            enhancer: {
                type: "fluid.component",
                options: {
                    gradeNames: "{that}.options.enhancerType",
                    components: {
                        uiEnhancer: {
                            options: {
                                gradeNames: [
                                    "{fluid.prefs.assembler.uie}.options.componentGrades.enactors",
                                    "{fluid.prefs.assembler.uie}.options.componentGrades.aliases_enhancer"
                                ],
                                defaultLocale: "{fluid.prefs.assembler.uie}.options.auxSchema.defaultLocale"
                            }
                        }
                    }
                }
            }
        },
        distributeOptions: {
            "uie.enhancer": {
                source: "{that}.options.enhancer",
                target: "{that uiEnhancer}.options",
                removeSource: true
            },
            "uie.enhancer.enhancerType": {
                source: "{that}.options.enhancerType",
                target: "{that > enhancer}.options.enhancerType"
            }
        }
    });

    fluid.defaults("fluid.prefs.assembler.prefsEd", {
        gradeNames: ["fluid.prefs.assembler.uie"],
        components: {
            prefsEditorLoader: {
                type: "fluid.viewComponent",
                container: "{fluid.prefs.assembler.prefsEd}.container",
                options: {
                    gradeNames: [
                        "{fluid.prefs.assembler.prefsEd}.options.componentGrades.terms",
                        "{fluid.prefs.assembler.prefsEd}.options.componentGrades.messages",
                        "{fluid.prefs.assembler.prefsEd}.options.componentGrades.initialModel",
                        "{fluid.prefs.assembler.prefsEd}.options.auxSchema.loaderGrades"
                    ],
                    defaultLocale: "{fluid.prefs.assembler.prefsEd}.options.auxSchema.defaultLocale",
                    templateLoader: {
                        gradeNames: ["{fluid.prefs.assembler.prefsEd}.options.componentGrades.templateLoader"]
                    },
                    messageLoader: {
                        gradeNames: ["{fluid.prefs.assembler.prefsEd}.options.componentGrades.messageLoader"]
                    },
                    prefsEditor: {
                        gradeNames: [
                            "{fluid.prefs.assembler.prefsEd}.options.componentGrades.panels",
                            "{fluid.prefs.assembler.prefsEd}.options.componentGrades.aliases_prefsEditor",
                            "fluid.prefs.uiEnhancerRelay"
                        ]
                    },
                    events: {
                        onReady: "{fluid.prefs.assembler.prefsEd}.events.onPrefsEditorReady"
                    }
                }
            }
        },
        events: {
            onPrefsEditorReady: null,
            onReady: {
                events: {
                    onPrefsEditorReady: "onPrefsEditorReady",
                    onCreate: "onCreate"
                },
                args: ["{that}"]
            }
        },
        distributeOptions: {
            "prefsEdAssembler.prefsEditor": {
                source: "{that}.options.prefsEditor",
                target: "{that prefsEditor}.options"
            },
            "prefsEdAssembler.prefsEditorLoader": {
                source: "{that}.options.prefsEditorLoader",
                target: "{that prefsEditorLoader}.options"
            }
        }
    });

    fluid.prefs.builder.generateGrade = function (name, namespace, options) {
        var gradeNameTemplate = "%namespace.%name";
        var gradeName = fluid.stringTemplate(gradeNameTemplate, {name: name, namespace: namespace});
        fluid.defaults(gradeName, options);
        return gradeName;
    };

    fluid.prefs.builder.constructGrades = function (auxSchema, gradeCategories) {
        var constructedGrades = {};
        fluid.each(gradeCategories, function (category) {
            var gradeOpts = auxSchema[category];
            if (fluid.get(gradeOpts, "gradeNames")) {
                constructedGrades[category] = fluid.prefs.builder.generateGrade(category, auxSchema.namespace, gradeOpts);
            }
        });
        return constructedGrades;
    };

    fluid.prefs.builder.parseAuxSchema = function (auxSchema) {
        var auxTypes = [];
        fluid.each(auxSchema, function parse(field) {
            var type = field.type;
            if (type) {
                auxTypes.push(type);
            }
        });
        return auxTypes;
    };

    fluid.prefs.builder.prioritizePrefs = function (preferences) {
        var prioritized = {};
        fluid.each(preferences, function (preference, index) {
            var record = {};
            if (index) {
                record.priority = "after:" + preferences[index - 1];
            }
            prioritized[preference] = record;
        });
        return prioritized;
    };

    fluid.prefs.builder.mergePrefs = function (that, mergingArray) {
        var merged = {};
        fluid.each(mergingArray, function (mergeRecord) {
            var expanded = fluid.expandImmediate(mergeRecord, that);

            fluid.each(expanded, function (prefConfig, preference) {
                if (prefConfig === null) {
                    delete merged[preference];
                    delete expanded[preference];
                }
            });

            $.extend(true, merged, expanded);
        });
        return merged;
    };

})(jQuery, fluid_3_0_0);
