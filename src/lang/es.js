// Missing keys (e.g. editor helpers) fall back to English.
export default {
    "card": {
        "air": "Aire",
        "rh": "HR",
        "leaf": "Hoja",
        "kpa": "kPa",
        "room": "Sala",
        "dewpoint": "Punto de rocío",
        "condensation": "Riesgo de condensación",
        "target": "Objetivo",
        "unavailable": "no disponible",
        "last_hours": "Últimas {hours} h",
        "reset_zoom": "Restablecer zoom",
        "zoom_hint": "Ctrl + rueda para hacer zoom",
        "mold_risk": "Riesgo de moho",
        "mold_detail": "{hours} h seguidas ≥ {humidity} % HR",
        "no_history": "Aún sin historial"
    },
    "editor": {
        "sections": {
            "rooms": "Salas",
            "chart": "Gráfico",
            "features": "Funciones",
            "history": "Historial",
            "texts": "Textos",
            "phases": "Fases VPD",
            "room_optional": "Ajustes opcionales",
            "formula": "Fórmula VPD"
        },
        "buttons": {
            "add_room": "Añadir sala",
            "remove_room": "Eliminar sala",
            "add_phase": "Añadir fase",
            "remove": "Eliminar",
            "reset_phases": "Restablecer fases"
        },
        "fields": {
            "name": "Nombre",
            "temperature": "Sensor de temperatura",
            "humidity": "Sensor de humedad",
            "leaf_temperature": "Sensor de temperatura de hoja",
            "vpd": "Sensor VPD",
            "color": "Color",
            "target_phase": "Fase objetivo",
            "min_temperature": "Temperatura mín.",
            "max_temperature": "Temperatura máx.",
            "min_humidity": "Humedad mín.",
            "max_humidity": "Humedad máx.",
            "min_height": "Altura mín. del gráfico (px)",
            "leaf_temperature_offset": "Desfase de temperatura de hoja",
            "is_bar_view": "Vista de barras",
            "enable_axes": "Ejes",
            "enable_triangle": "Marcador triangular (en lugar de punto)",
            "enable_tooltip": "Tooltip",
            "enable_crosshair": "Cruz de cursor",
            "enable_zoom": "Zoom",
            "enable_legend": "Leyenda",
            "enable_cycle_rooms": "Rotar salas",
            "enable_show_always_information": "Mostrar siempre detalles",
            "enable_dewpoint": "Punto de rocío y aviso de condensación",
            "enable_phase_stats": "Tiempo por fase",
            "enable_mold_risk": "Aviso de moho",
            "mold_risk_humidity": "Moho: umbral de humedad",
            "mold_risk_hours": "Moho: duración (horas)",
            "history_hours": "Historial (horas)",
            "tap_action": "Tocar una sala",
            "enable_wheel_zoom": "Zoom con la rueda (sin Ctrl)",
            "air_text": "Etiqueta aire",
            "leaf_text": "Etiqueta hoja",
            "rh_text": "Etiqueta humedad",
            "kpa_text": "Etiqueta unidad VPD",
            "phase_name": "Nombre CSS",
            "phase_label": "Etiqueta"
        },
        "tap_actions": {
            "none": "Seleccionar sala",
            "more-info": "Abrir detalles de la entidad"
        },
        "room_missing_sensors": "Faltan sensores",
        "no_target": "Sin objetivo",
        "formula_error": "Error en la fórmula"
    }
};
