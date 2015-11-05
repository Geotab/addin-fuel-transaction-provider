geotab.addin.addinTemplate = function () {
    "use strict";

    // Geotab Addin variables
    var api,
        state;

    // DOM Elements
    var elSave;
    var elReset;
    var elForm;
    var elCustomerId;
    var elProvider;
    var elLastRun;
    var elContainer;
    var elAlertSuccess;
    var elAlertInfo;
    var elAlertError;
    var elAlertDummy;
    var elAccountSettings;

    var systemSettings;
    var providerSettings;
    var isLegacy;

    var tmpl = (function () {
        var cache = {};

        return function tmpl(str, data) {
            // Figure out if we're getting a template, or if we need to
            // load the template - and be sure to cache the result.
            var fn = !/\W/.test(str) ?
                cache[str] = cache[str] ||
                    tmpl(document.getElementById(str).innerHTML) :

                // Generate a reusable function that will serve as a template
                // generator (and which will be cached).
                new Function("obj",
                    "var p=[],print=function(){p.push.apply(p,arguments);};" +

                        // Introduce the data as local variables using with(){}
                    "with(obj){p.push('" +

                        // Convert the template into pure JavaScript
                    str
                        .replace(/[\r\t\n]/g, " ")
                        .split("<%").join("\t")
                        .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                        .replace(/\t=(.*?)%>/g, "',$1,'")
                        .split("\t").join("');")
                        .split("%>").join("p.push('")
                        .split("\r").join("\\'")
                    + "');}return p.join('');");

            // Provide some basic currying to the user
            return data ? fn(data) : fn;
        };
    }());

    var toggleVisible = function (el, show) {
        el.style.display = show ? "block" : "none";
    };

    var successTimer;

    var toggleAlert = function (el, content) {
        clearTimeout(successTimer);
        elAlertDummy.style.display = "block";
        elAlertSuccess.style.display = "none";
        elAlertInfo.style.display = "none";
        elAlertError.style.display = "none";
        if (el) {
            el.querySelector("span").textContent = content;
            elAlertDummy.style.display = "none";
            el.style.display = "block";
        }
    };

    var showSaveSuccess = function (callback) {
        toggleAlert(elAlertSuccess, "Saved");
        successTimer = setTimeout(function () {
            toggleAlert();
            callback && callback();
        }, 3000);
    };

    var clearFields = function () {
        elAccountSettings.innerHTML = "";
    };

    var getEmptyProvider = function () {
        return {
            customerId: "",
            fuelTransactionProvider: "Unknown",
            lastRun: "0001-01-01",
            button: "none"
        };
    };

    var focusOnLast = function () {
        var customerIds = document.querySelectorAll(".customerId");
        customerIds[customerIds.length - 1].focus();
    };

    var guid = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };

    var render = function () {
        var elRemoveBtns,
            elCustomerIds,
            i;

        if (!providerSettings) {
            toggleAlert(elAlertError, "The addin is not supported in this version of the application");
            return;
        }

        // legacy version can only support one provider
        if (!isLegacy || (isLegacy && !providerSettings.length)) {
            providerSettings = providerSettings.concat(getEmptyProvider());
        }

        elAccountSettings.innerHTML = providerSettings
            .map(function (setting) {
                return tmpl("accountSettingsTempl", {
                    customerId: setting.customerId || "",
                    fuelTransactionProvider: setting.fuelTransactionProvider,
                    lastRun: setting.lastRun === "0001-01-01" ? "Never" : setting.lastRun,
                    button: setting.button || "remove",
                    id: guid()
                });
            })
            .join("");

        elRemoveBtns = document.querySelectorAll(".remove");
        for (i = 0; i < elRemoveBtns.length; i++) {
            elRemoveBtns[i].addEventListener('click', function (e) {
                var tr = e.target;

                while (tr.nodeName !== 'TR') {
                    tr = tr.parentNode;
                }

                tr.parentNode.removeChild(tr);

                getProviderValues();

                render();
            }, false);
        }

        elCustomerIds = document.querySelectorAll(".customerId");
        for (i = 0; i < elCustomerIds.length; i++) {
            elCustomerIds[i].addEventListener('change', function (e) {
                getProviderValues();
                render();
            }, false);
        }

        toggleVisible(elForm, true);
        focusOnLast();
    };

    var load = function () {
        toggleVisible(elForm, false);
        toggleAlert(elAlertInfo, "Loading...");
        return api.call("Get", {
                typeName: "SystemSettings"
            },
            function (result) {
                systemSettings = result[0];
                isLegacy = !!systemSettings.fuelTransactionImportSettings;
                providerSettings = isLegacy ? [systemSettings.fuelTransactionImportSettings] : systemSettings.fuelTransactionImportSettingsList;
                toggleAlert();
                render();
            },
            function (err) {
                toggleAlert(elAlertError, err.toString());
            });
    };

    var getProviderValues = function () {
        var i,
            customerIds = [],
            lastRuns = [],
            newProviderSettings,
            elCustomerIds = elAccountSettings.querySelectorAll('.customerId'),
            elLastRuns = elAccountSettings.querySelectorAll('.lastRun');

        for (i = 0; i < elCustomerIds.length; i++) {
            customerIds.push(elCustomerIds[i].value);
            lastRuns.push(elLastRuns[i].value);
        }

        newProviderSettings = customerIds
            .map(function (id, i) {
                return {
                    customerId: id,
                    fuelTransactionProvider: "Wex",
                    lastRun: lastRuns[i] === "Never" ? "0001-01-01" : lastRuns[i]
                }
            })
            .filter(function (setting) {
                return !!setting.customerId;
            });

        providerSettings = newProviderSettings;
    };

    var hasDuplicate = function (providers) {
        var i,
            customerId,
            customerIds = {};

        for (i = 0; i < providers.length; i++) {
            customerId = providers[i].customerId;
            if (customerIds[customerId]) {
                return customerId;
            }
            customerIds[customerId] = true;
        }

        return false;
    };

    var save = function (e) {
        var duplicate;

        e.preventDefault();

        getProviderValues();

        if (duplicate = hasDuplicate(providerSettings)) {
            toggleAlert(elAlertError, "Duplicate customer id");
            document.querySelector(".customerId[value='" + duplicate + "']").focus();
            return;
        }

        toggleAlert(elAlertInfo, "Saving...");

        if (isLegacy) {
            // running older version of MyGeotab
            systemSettings.fuelTransactionImportSettings = !providerSettings.length ? getEmptyProvider() : providerSettings[0]
        } else {
            systemSettings.fuelTransactionImportSettingsList = providerSettings;
        }

        return api.call("Set", {
                typeName: "SystemSettings",
                entity: systemSettings
            },
            function () {
                showSaveSuccess();
            },
            function (err) {
                toggleAlert(elAlertError, err.toString());
            });
    };

    return {
        initialize: function (geotabApi, pageState, initializeCallback) {
            api = geotabApi;
            state = pageState;

            elSave = document.getElementById("save");
            elReset = document.getElementById("reset");
            elForm = document.getElementById("form");
            elCustomerId = document.getElementById("customerId");
            elProvider = document.getElementById("provider");
            elLastRun = document.getElementById("lastRun");
            elAlertInfo = document.getElementById("alertInfo");
            elContainer = document.getElementById("fuelTransactionProviderId");
            elAlertSuccess = document.getElementById("alertSuccess");
            elAlertError = document.getElementById("alertError");
            elAlertDummy = document.getElementById("dummy");
            elAccountSettings = document.getElementById("accountSettings");
            initializeCallback();
        },

        focus: function () {
            // events
            elSave.addEventListener("click", save, false);
            elReset.addEventListener("click", load, false);
            load();
            elContainer.style.display = "block";
        },

        blur: function () {
            // events
            elSave.removeEventListener("click", save, false);
            elReset.removeEventListener("click", load, false);
            clearFields();
        }
    };
};
