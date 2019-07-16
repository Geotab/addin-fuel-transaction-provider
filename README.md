# Fuel Transaction Provider Addin

Save the customer id assigned by your fuel transaction provider to enable automated fuel transaction importing. Fuel transactions will be imported once per 24 hour period. Fuel card provider must be supported by MyGeotab.

### Installation
Add the configuation below to the to the system setting -> addins section of the MyGeotab database
```
{
    "supportEmail": "support@example.com",
    "isSigned": false,
    "signature": "12345-MYSIGNATURE",
    "name": "Fuel Transaction Provider (by Geotab)",
    "items": [
        {
            "icon": "https://cdn.jsdelivr.net/gh/Geotab/addin-fuel-transaction-provider@master/images/icon.png",
            "path": "EngineMaintenanceLink/",
            "menuName": {
                "en": "Fuel Transaction Provider"
            },
            "url": "https://cdn.jsdelivr.net/gh/Geotab/addin-fuel-transaction-provider@master/fuelTransactionProvider.html"
        }
    ],
    "version": "2.1.0",
    "key": "12345-MYAPIKEY"
}
```
