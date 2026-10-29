// Missing keys (e.g. editor helpers) fall back to English.
export default {
    "card": {
        "air": "Воздух",
        "rh": "ОВ",
        "leaf": "Лист",
        "kpa": "кПа",
        "room": "Комната",
        "dewpoint": "Точка росы",
        "condensation": "Риск конденсации",
        "target": "Цель",
        "unavailable": "недоступно",
        "last_hours": "Последние {hours} ч",
        "reset_zoom": "Сбросить масштаб",
        "zoom_hint": "Ctrl + колесо для масштаба",
        "mold_risk": "Риск плесени",
        "mold_detail": "{hours} ч подряд ≥ {humidity} % ОВ",
        "no_history": "Истории пока нет"
    },
    "editor": {
        "sections": {
            "rooms": "Комнаты",
            "chart": "График",
            "features": "Функции",
            "history": "История",
            "texts": "Тексты",
            "phases": "Фазы VPD",
            "room_optional": "Дополнительные настройки",
            "formula": "Формула VPD"
        },
        "buttons": {
            "add_room": "Добавить комнату",
            "remove_room": "Удалить комнату",
            "add_phase": "Добавить фазу",
            "remove": "Удалить",
            "reset_phases": "Сбросить фазы"
        },
        "fields": {
            "name": "Название",
            "temperature": "Датчик температуры",
            "humidity": "Датчик влажности",
            "leaf_temperature": "Датчик температуры листа",
            "vpd": "Датчик VPD",
            "color": "Цвет",
            "target_phase": "Целевая фаза",
            "min_temperature": "Мин. температура",
            "max_temperature": "Макс. температура",
            "min_humidity": "Мин. влажность",
            "max_humidity": "Макс. влажность",
            "min_height": "Мин. высота графика (px)",
            "leaf_temperature_offset": "Смещение температуры листа",
            "is_bar_view": "Вид столбцов",
            "enable_axes": "Оси",
            "enable_triangle": "Треугольный маркер (вместо точки)",
            "enable_tooltip": "Подсказка",
            "enable_crosshair": "Перекрестие",
            "enable_zoom": "Масштаб",
            "enable_legend": "Легенда",
            "enable_cycle_rooms": "Переключать комнаты",
            "enable_show_always_information": "Всегда показывать детали",
            "enable_dewpoint": "Точка росы и предупреждение о конденсации",
            "enable_phase_stats": "Время в фазе",
            "enable_mold_risk": "Предупреждение о плесени",
            "mold_risk_humidity": "Плесень: порог влажности",
            "mold_risk_hours": "Плесень: длительность (часы)",
            "history_hours": "История (часы)",
            "tap_action": "Нажатие на комнату",
            "enable_wheel_zoom": "Масштаб колесом (без Ctrl)",
            "air_text": "Подпись «воздух»",
            "leaf_text": "Подпись «лист»",
            "rh_text": "Подпись «влажность»",
            "kpa_text": "Подпись единицы VPD",
            "phase_name": "Имя CSS",
            "phase_label": "Подпись"
        },
        "tap_actions": {
            "none": "Выбрать комнату",
            "more-info": "Открыть сведения об объекте"
        },
        "room_missing_sensors": "Нет датчиков",
        "no_target": "Без цели",
        "formula_error": "Ошибка в формуле"
    }
};
