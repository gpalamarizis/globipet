"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServicesMap;
var lucide_react_1 = require("lucide-react");
function ServicesMap(_a) {
    var services = _a.services;
    return (<div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-200 dark:border-gray-700">
      <lucide_react_1.MapPin size={40} className="text-gray-400"/>
      <p className="text-gray-500 font-medium">Χάρτης Υπηρεσιών</p>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        Βρέθηκαν {services.length} υπηρεσίες στην περιοχή σας
      </p>
      <p className="text-xs text-gray-400">
        Ενσωμάτωση Google Maps — απαιτεί API key
      </p>
    </div>);
}
