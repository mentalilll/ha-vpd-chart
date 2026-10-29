export const CARD_VERSION = __VERSION__;

export const DEFAULT_PHASES = [
    {upper: 0, className: 'gray-danger-zone', color: '#999999'},
    {lower: 0, upper: 0.4, className: 'under-transpiration', color: '#1a6c9c'},
    {lower: 0.4, upper: 0.8, className: 'early-veg', color: '#22ab9c'},
    {lower: 0.8, upper: 1.2, className: 'late-veg', color: '#9cc55b'},
    {lower: 1.2, upper: 1.6, className: 'mid-late-flower', color: '#e7c12b'},
    {lower: 1.6, className: 'danger-zone', color: '#ce4234'},
];

// distinct, colour-blind friendly room colours (Okabe-Ito based)
export const ROOM_COLORS = ['#ffffff', '#56b4e9', '#e69f00', '#cc79a7', '#f0e442', '#009e73', '#d55e00', '#0072b2'];

export const DEFAULT_LEAF_OFFSET = 2;
export const CYCLE_INTERVAL_MS = 10000;
export const HISTORY_REFRESH_MS = 5 * 60 * 1000;
export const MAX_ZOOM = 4;
export const MOLD_RISK_WINDOW_HOURS = 24;

export const DEFAULTS = {
    is_bar_view: false,
    min_temperature: 5,
    max_temperature: 35,
    min_humidity: 10,
    max_humidity: 90,
    min_height: 200,
    leaf_temperature_offset: DEFAULT_LEAF_OFFSET,
    enable_tooltip: true,
    enable_axes: true,
    enable_triangle: true,
    enable_crosshair: true,
    enable_zoom: true,
    enable_wheel_zoom: false,
    enable_legend: true,
    enable_cycle_rooms: false,
    enable_show_always_information: true,
    enable_dewpoint: false,
    enable_phase_stats: true,
    history_hours: 0,
    enable_mold_risk: false,
    mold_risk_humidity: 75,
    mold_risk_hours: 6,
    tap_action: 'none',
};

export const FAHRENHEIT_RANGE = {min_temperature: 41, max_temperature: 95};
