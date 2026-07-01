"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EventCard;
var react_router_dom_1 = require("react-router-dom");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function EventCard(_a) {
    var event = _a.event;
    var spotsLeft = event.capacity ? event.capacity - event.registered_count : null;
    return (<react_router_dom_1.Link to={"/events/".concat(event.id)} className="card overflow-hidden group hover:shadow-card-hover transition-all duration-200 block">
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
        {event.image_url ? <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/> : <div className="w-full h-full flex items-center justify-center text-3xl">🎉</div>}
        {event.is_featured && <div className="absolute top-2 left-2 badge bg-brand-900 text-white">⭐ Featured</div>}
        {event.is_international && <div className="absolute top-2 right-2 badge bg-blue-600 text-white">🌍</div>}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">{event.title}</h3>
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5"><lucide_react_1.Calendar size={12}/>{(0, utils_1.formatDate)(event.date, { day: 'numeric', month: 'short', year: 'numeric' })} · {event.time}</div>
          <div className="flex items-center gap-1.5"><lucide_react_1.MapPin size={12}/>{event.city}, {event.country}</div>
          {spotsLeft !== null && <div className="flex items-center gap-1.5"><lucide_react_1.Users size={12}/>{spotsLeft > 0 ? "".concat(spotsLeft, " \u03B8\u03AD\u03C3\u03B5\u03B9\u03C2 \u03B4\u03B9\u03B1\u03B8\u03AD\u03C3\u03B9\u03BC\u03B5\u03C2") : 'Εξαντλήθηκε'}</div>}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="font-bold text-brand-900 dark:text-brand-400">{event.price === 0 ? 'Δωρεάν' : (0, utils_1.formatCurrency)(event.price, event.currency)}</p>
          <button className="btn-primary text-xs py-1.5 flex items-center gap-1"><lucide_react_1.Ticket size={13}/>Εισιτήρια</button>
        </div>
      </div>
    </react_router_dom_1.Link>);
}
