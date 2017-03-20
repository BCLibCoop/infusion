/*
Copyright 2014-2017 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

var fluid_3_0_0 = fluid_3_0_0 || {};

(function ($, fluid) {
    "use strict";

    /**********************************************************************************
    * speakPanel
    **********************************************************************************/
    fluid.defaults("fluid.prefs.panel.speak", {
        gradeNames: ["fluid.prefs.panel.switchAduster"],
        preferenceMap: {
            "fluid.prefs.speak": {
                "model.value": "default"
            }
        }
    });

})(jQuery, fluid_3_0_0);
